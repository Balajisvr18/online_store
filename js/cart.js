const apiUrl = ENV.API_URL; // Get API URL directly from config.js
const customerEmail = sessionStorage.getItem('customerEmail');
let creditScore = 0;
let totalAmount = 0;
let newCreditScore=0;
// Fetch cart items and display them
function fetchCartItems() {
    $.ajax({
        url: `${apiUrl}cart/${customerEmail}`,
        method: 'GET',
        dataType: 'json',
        success: function (cartData) {
            if (cartData.fields && cartData.fields.items) {
                const cartItems = cartData.fields.items.arrayValue.values.map(item => ({
                    itemId: item.mapValue.fields.itemId.integerValue,
                    quantity: item.mapValue.fields.quantity.integerValue
                }));
                const itemIds = cartItems.map(cartItem => cartItem.itemId);
                fetchInventoryItems(itemIds, cartItems); // Fetch inventory details
            }
        },
        error: function (error) {
            if (error.status === 404) {
                $('#cartItemsContainer').html('<p>Your cart is empty.</p>');
                $('#totalAmount').html(`Total Price: $<span id="totalAmountValue">0</span>`);
            } else {
                console.error('Error fetching cart items:', error);
                alert('An error occurred while fetching cart items.');
            }
        }
    });
}

// Fetch inventory items using item IDs from the cart
function fetchInventoryItems(itemIds, cartItems) {
    $.ajax({
        url: `${apiUrl}inventory`,
        method: 'GET',
        dataType: 'json',
        success: function (inventoryData) {
            const itemsInInventory = inventoryData.documents.filter(item => itemIds.includes(item.fields.item_id.integerValue));
            displayCartItems(itemsInInventory, cartItems);
        },
        error: function (error) {
            console.error('Error fetching inventory items:', error);
        }
    });
}

function displayCartItems(inventoryItems, cartItems) {
    let cartHtml = '';
    totalAmount = 0; // Reset total amount
    let hasUnavailableItems = false;
    let hasOutOfStockItems = false;

    inventoryItems.forEach(inventoryItem => {
        const itemId = inventoryItem.fields.item_id.integerValue;
        const itemName = inventoryItem.fields.item_name.stringValue;
        const description = inventoryItem.fields.des ? inventoryItem.fields.des.stringValue : 'No description available';
        const price = inventoryItem.fields.price.doubleValue || inventoryItem.fields.price.integerValue;
        const quantityAvailable = inventoryItem.fields.qty.integerValue;
        const availability = inventoryItem.fields.availability.booleanValue;
        const imageUrl = inventoryItem.fields.image ? `data:image/png;base64,${inventoryItem.fields.image.stringValue}` : '';

        // Find corresponding cart item
        const cartItem = cartItems.find(cart => cart.itemId == itemId);
        const selectedQty = cartItem ? cartItem.quantity : 1;
        const totalPrice = price * selectedQty;

        // Apply constraints based on availability and stock levels
        if (!availability) {
            hasUnavailableItems = true; // Track unavailable items
            cartHtml += `
                <div class="card">
                    <img src="${imageUrl}" alt="${itemName}">
                    <h4>${itemName}</h4>
                    <p>${description}</p>
                    <p style="color: red;">Item not available<br><br/>delete this to proceed</p>
                    <button onclick="deleteCartItem('${itemId}')">Delete</button>
                </div>`;
        } else if (quantityAvailable == 0) {
            hasOutOfStockItems = true; // Track out-of-stock items
            cartHtml += `
                <div class="card">
                    <img src="${imageUrl}" alt="${itemName}">
                    <h4>${itemName}</h4>
                    <p>${description}</p>
                    <p style="color: red;">Out of stock<br><br/>delete this to proceed</p>
                    <button onclick="deleteCartItem('${itemId}')">Delete</button>
                </div>`;
        } else {
            // Generate cart HTML for available and in-stock items
            cartHtml += `
                <div class="card">
                    <img src="${imageUrl}" alt="${itemName}">
                    <h4>${itemName}</h4>
                    <p>${description}</p>
                    <p>Price: $${price}</p>
                    <p>Available: ${quantityAvailable}</p>
                    <input type="number" id="qty_${itemId}" min="1" max="${quantityAvailable}" value="${selectedQty}" onchange="validateAndUpdateCartItem('${itemId}', ${price}, ${quantityAvailable})">
                    <p>Total Price: $<span id="totalPrice_${itemId}">${totalPrice}</span></p>
                    <button onclick="deleteCartItem('${itemId}')">Delete</button>
                </div>`;
            totalAmount += totalPrice;
        }
    });

    $('#cartItemsContainer').html(cartHtml);
    $('#totalAmount').html(`Total Price: $<span id="totalAmountValue">${totalAmount}</span>`);
    enablePaymentButtons(hasUnavailableItems, hasOutOfStockItems); // Pass conditions to check button enabling
}

// Enable payment buttons based on availability, stock, and credit score
function enablePaymentButtons(hasUnavailableItems, hasOutOfStockItems) {
    const payWithCash = $('#payWithCash');
    const payWithCredit = $('#payWithCredit');

    // Disable buttons if there are unavailable or out-of-stock items
    if (hasUnavailableItems || hasOutOfStockItems) {
        payWithCash.prop('disabled', true);
        payWithCredit.prop('disabled', true);
    } else {
        payWithCash.prop('disabled', false); // Cash is always enabled
        if (creditScore >= 1000 && creditScore >= totalAmount) {
            payWithCredit.prop('disabled', false); // Enable credit if conditions met
        } else {
            payWithCredit.prop('disabled', true); // Disable credit button otherwise
        }
    }
}

// Validate quantity input and update cart item
function validateAndUpdateCartItem(itemId, price, availableQty) {
    const newQuantity = parseInt($(`#qty_${itemId}`).val());

    if (newQuantity > availableQty) {
        alert(`Please enter a quantity less than or equal to ${availableQty}.`);
        $(`#qty_${itemId}`).val(1); // Set it back to the maximum available quantity
    } else {
        updateCartItem(itemId, price);
    }
}

// Update cart item quantity and recalculate total price dynamically
function updateCartItem(itemId, price) {
    const newQuantity = parseInt($(`#qty_${itemId}`).val());
    const userId = customerEmail;

    // Fetch the cart document
    $.ajax({
        url: `${apiUrl}cart/${userId}`,
        method: 'GET',
        dataType: 'json',
        success: function (cartData) {
            let items = cartData.fields.items.arrayValue.values;
            const cartIndex = items.findIndex(item => item.mapValue.fields.itemId.integerValue === itemId);

            if (cartIndex !== -1) {
                // Update the quantity in the cart
                items[cartIndex].mapValue.fields.quantity.integerValue = newQuantity;

                // Update Firestore with the modified cart items
                $.ajax({
                    url: `${apiUrl}cart/${userId}?updateMask.fieldPaths=items`,
                    method: 'PATCH',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        fields: {
                            items: {
                                arrayValue: {
                                    values: items
                                }
                            }
                        }
                    }),
                    success: function () {
                        // Update the total price for this item
                        const newTotalPrice = newQuantity * price;
                        $(`#totalPrice_${itemId}`).text(newTotalPrice);

                        // Recalculate the total amount for all items
                        recalculateTotalAmount();
                    },
                    error: function (error) {
                        console.error('Error updating cart item:', error);
                    }
                });
            }
        },
        error: function (error) {
            console.error('Error fetching cart data:', error);
        }
    });
}

// Recalculate total price for all items after quantity update
function recalculateTotalAmount() {
    totalAmount = 0;

    // Recalculate the total based on each item's updated total price
    $('[id^=totalPrice_]').each(function () {
        const itemTotalPrice = parseFloat($(this).text());
        totalAmount += itemTotalPrice;
    });

    // Update the total amount displayed in the center of the screen
    $('#totalAmountValue').text(totalAmount);
}

// Delete cart item
function deleteCartItem(itemId) {
    const userId = customerEmail;
    if (confirm('Are you sure you want to delete this item?')) {
        $.ajax({
            url: `${apiUrl}cart/${userId}`,
            method: 'GET',
            dataType: 'json',
            success: function (cartData) {
                let items = cartData.fields.items.arrayValue.values;
                items = items.filter(item => item.mapValue.fields.itemId.integerValue !== itemId);

                $.ajax({
                    url: `${apiUrl}cart/${userId}?updateMask.fieldPaths=items`,
                    method: 'PATCH',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        fields: {
                            items: {
                                arrayValue: {
                                    values: items
                                }
                            }
                        }
                    }),
                    success: function () {
                        // Check if the cart is now empty, if yes, display the empty cart message
                        if (items.length === 0) {
                            $('#cartItemsContainer').html('<p>Your cart is empty.</p>');
                            $('#totalAmount').html(`Total Price: $<span id="totalAmountValue">0</span>`);
                        } else {
                            fetchCartItems(); // Refresh the cart display
                        }
                    },
                    error: function (error) {
                        console.error('Error deleting cart item:', error);
                    }
                });
            },
            error: function (error) {
                console.error('Error fetching cart data:', error);
            }
        });
    }
}


// Function to update credit score without losing other customer details
function updateCreditScore(newCreditScore) {
    // Fetch customer data first to retain other fields
    $.ajax({
        url: `${apiUrl}customer`, // Firestore customer collection
        method: 'GET',
        dataType: 'json',
        success: function (data) {
            const customer = data.documents.find(doc => doc.fields.email.stringValue === customerEmail);
            if (customer) {
                const documentId = customer.name.split('/').pop(); // Extract document ID

                // Retrieve existing customer data to keep other fields
                $.ajax({
                    url: `${apiUrl}customer/${documentId}`,
                    method: 'GET',
                    dataType: 'json',
                    success: function (existingData) {
                        // Prepare updated data by keeping existing fields
                        const updatedFields = {
                            ...existingData.fields, // Spread existing fields
                            credit_score: { integerValue: newCreditScore } // Update credit score
                        };

                        // Patch request to update the customer's credit score
                        $.ajax({
                            url: `${apiUrl}customer/${documentId}`,
                            method: 'PATCH',
                            contentType: 'application/json',
                            data: JSON.stringify({
                                fields: updatedFields
                            }),
                            success: function () {
                                alert('Credit score updated successfully.');
                            },
                            error: function (error) {
                                console.error('Error updating credit score:', error);
                            }
                        });
                    },
                    error: function (error) {
                        console.error('Error fetching customer details:', error);
                    }
                });
            } else {
                alert('Customer not found.');
            }
        },
        error: function (error) {
            console.error('Error fetching customer data:', error);
        }
    });
}
// Pay with credit score
function payWithCreditScore() {
    if (creditScore >= totalAmount) {
        const newCreditScore = parseInt(creditScore, 10) - totalAmount;
        updateCreditScore(newCreditScore);
        generateInvoice('credit'); // Generate the invoice with credit method
        completeOrder('credit');
    } else {
        alert('Insufficient credit score!');
    }
}

// Pay with cash and add credit score bonus
function payWithCash() {
    const bonus = Math.floor(totalAmount / 100) * 10;
    const newCreditScore = parseInt(creditScore, 10) + bonus;
    updateCreditScore(newCreditScore);
    generateInvoice('cash'); // Generate the invoice with cash method
    completeOrder('cash');
}

// Function to generate the invoice as a CSV file and download it
function generateInvoice(paymentMethod) {
    const date = new Date().toLocaleString(); // Get the current date and time
    let csvContent = 'Item Name,Quantity,Price,Subtotal\n'; // CSV header
    let grandTotal = 0;

    // Get all the item IDs in the cart
    const itemIds = $('[id^=totalPrice_]').map(function () {
        return $(this).attr('id').split('_')[1];
    }).get();

    // Fetch item details from the inventory table using AJAX
    $.ajax({
        url: `${apiUrl}inventory`,
        method: 'GET',
        dataType: 'json',
        success: function (inventoryData) {
            // Filter the inventory data for items in the cart
            const itemsInInventory = inventoryData.documents.filter(item => itemIds.includes(item.fields.item_id.integerValue));

            // Loop through each item in the cart to build the CSV content
            $('[id^=totalPrice_]').each(function () {
                const itemId = $(this).attr('id').split('_')[1]; // Extract itemId from element ID
                const quantity = parseInt($(`#qty_${itemId}`).val(), 10); // Get selected quantity

                // Fetch item details from inventory data
                const inventoryItem = itemsInInventory.find(item => item.fields.item_id.integerValue == itemId);
                const itemName = inventoryItem.fields.item_name.stringValue;
                const price = parseFloat(inventoryItem.fields.price.doubleValue || inventoryItem.fields.price.integerValue);
                const subTotal = quantity * price; // Calculate subtotal for the item

                grandTotal += subTotal; // Accumulate the total price

                // Add item details to the CSV content
                csvContent += `${itemName},${quantity},${price},${subTotal}\n`;
            });

            // Add the grand total, date, and payment method at the end of the CSV
            csvContent += `\nGrand Total,,,$${grandTotal}\n`;
            csvContent += `Date: ${date}\n`;
            csvContent += `Payment Method: ${paymentMethod}\n`;

            // Download the CSV file
            const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `invoice_${paymentMethod}_${date.replace(/[\/,: ]/g, '_')}.csv`);
            document.body.appendChild(link); // Required for Firefox
            link.click();
            document.body.removeChild(link);
        },
        error: function (error) {
            console.error('Error fetching inventory items for the invoice:', error);
        }
    });
}

// Complete the order
function completeOrder(paymentMethod) {
    // Fetch the cart document
    $.ajax({
        url: `${apiUrl}cart/${customerEmail}`,
        method: 'GET',
        dataType: 'json',
        success: function (cartData) {
            const items = cartData.fields.items.arrayValue.values;
            const order = {
                items: items.map(item => ({
                    itemId: item.mapValue.fields.itemId.integerValue,
                    quantity: item.mapValue.fields.quantity.integerValue
                })),
                amount: totalAmount,
                date: new Date().toISOString(),
                paymentMethod: paymentMethod
            };

            // Update the order history
            updateOrderHistory(order);

            // Update the inventory
            updateInventoryAfterOrder(order.items);
        },
        error: function (error) {
            console.error('Error fetching cart data:', error);
        }
    });
}
// Update the inventory quantity after an order
function updateInventoryAfterOrder(cartItems) {
    cartItems.forEach(cartItem => {
        const itemId = cartItem.itemId;
        const selectedQty = cartItem.quantity;

        // Fetch the current inventory item by itemId
        $.ajax({
            url: `${apiUrl}inventory`, // Fetch the full list of inventory items
            method: 'GET',
            dataType: 'json',
            success: function (inventoryData) {
                // Find the specific inventory item by itemId
                const inventoryItem = inventoryData.documents.find(doc => doc.fields.item_id.integerValue === itemId);

                if (inventoryItem) {
                    const documentId = inventoryItem.name.split('/').pop(); // Extract the documentId

                    const currentQty = inventoryItem.fields.qty.integerValue;
                    const updatedQty = currentQty - selectedQty; // Subtract selected quantity from the current quantity

                    // Ensure no other fields are lost when updating the inventory
                    const updatedFields = {
                        ...inventoryItem.fields, // Retain all existing fields
                        qty: { integerValue: updatedQty } // Update only the quantity field
                    };

                    // Make a PATCH request to update the inventory item with the new quantity
                    $.ajax({
                        url: `${apiUrl}inventory/${documentId}`, // Use the documentId to update the specific item
                        method: 'PATCH',
                        contentType: 'application/json',
                        data: JSON.stringify({ fields: updatedFields }),
                        success: function () {
                            console.log(`Inventory for item ${itemId} updated successfully.`);
                        },
                        error: function (error) {
                            console.error(`Error updating inventory for item ${itemId}:`, error);
                        }
                    });
                } else {
                    console.error(`Item with itemId ${itemId} not found in inventory.`);
                }
            },
            error: function (error) {
                console.error(`Error fetching inventory for item ${itemId}:`, error);
            }
        });
    });
}

// Update order history
function updateOrderHistory(order) {
    $.ajax({
        url: `${apiUrl}order_history/${customerEmail}`,
        method: 'GET',
        dataType: 'json',
        success: function (orderData) {
            let orderHistory = [];
            if (orderData.fields && orderData.fields.orders) {
                orderHistory = orderData.fields.orders.arrayValue.values.map(orderItem => ({
                    items: orderItem.mapValue.fields.items.arrayValue.values.map(item => ({
                        itemId: item.mapValue.fields.itemId.integerValue,
                        quantity: item.mapValue.fields.quantity.integerValue
                    })),
                    amount: orderItem.mapValue.fields.amount.integerValue,
                    date: orderItem.mapValue.fields.date.stringValue,
                    paymentMethod: orderItem.mapValue.fields.paymentMethod.stringValue
                }));
            }

            // Add the new order to the order history
            orderHistory.push(order);
            saveOrderHistory(orderHistory);
        },
        error: function () {
            // If order history doesn't exist, create a new one
            saveOrderHistory([order]);
        }
    });
}

// Save order history to Firestore
function saveOrderHistory(orderHistory) {
    $.ajax({
        url: `${apiUrl}order_history/${customerEmail}`,
        method: 'PATCH',
        contentType: 'application/json',
        data: JSON.stringify({
            fields: {
                orders: {
                    arrayValue: {
                        values: orderHistory.map(order => ({
                            mapValue: {
                                fields: {
                                    items: {
                                        arrayValue: {
                                            values: order.items.map(item => ({
                                                mapValue: {
                                                    fields: {
                                                        itemId: { integerValue: item.itemId },
                                                        quantity: { integerValue: item.quantity }
                                                    }
                                                }
                                            }))
                                        }
                                    },
                                    amount: { integerValue: order.amount },
                                    date: { stringValue: order.date },
                                    paymentMethod: { stringValue: order.paymentMethod }
                                }
                            }
                        }))
                    }
                }
            }
        }),
        success: function () {
            // Clear the cart after successful order
            clearCart();
        },
        error: function (error) {
            console.error('Error saving order history:', error);
        }
    });
}

// Clear the cart after order completion
function clearCart() {
    $.ajax({
        url: `${apiUrl}cart/${customerEmail}`,
        method: 'DELETE',
        success: function () {
            alert('Order placed successfully. Cart is now empty.');
            fetchCartItems(); // Refresh cart
            fetchCreditScore();
        },
        error: function (error) {
            console.error('Error clearing the cart:', error);
        }
    });
}
// Function to update credit score without losing other customer details
function updateCreditScore(newCreditScore) {
    // Fetch customer data first to retain other fields
    $.ajax({
        url: `${apiUrl}customer`, // Firestore customer collection
        method: 'GET',
        dataType: 'json',
        success: function (data) {
            const customer = data.documents.find(doc => doc.fields.email.stringValue === customerEmail);
            if (customer) {
                const documentId = customer.name.split('/').pop(); // Extract document ID

                // Retrieve existing customer data to keep other fields
                $.ajax({
                    url: `${apiUrl}customer/${documentId}`,
                    method: 'GET',
                    dataType: 'json',
                    success: function (existingData) {
                        // Prepare updated data by keeping existing fields
                        const updatedFields = {
                            ...existingData.fields, // Spread existing fields
                            credit_score: { integerValue: newCreditScore } // Update credit score
                        };

                        // Patch request to update the customer's credit score
                        $.ajax({
                            url: `${apiUrl}customer/${documentId}`,
                            method: 'PATCH',
                            contentType: 'application/json',
                            data: JSON.stringify({
                                fields: updatedFields
                            }),
                            success: function () {
                                alert('Credit score updated successfully.');
                            },
                            error: function (error) {
                                console.error('Error updating credit score:', error);
                            }
                        });
                    },
                    error: function (error) {
                        console.error('Error fetching customer details:', error);
                    }
                });
            } else {
                alert('Customer not found.');
            }
        },
        error: function (error) {
            console.error('Error fetching customer data:', error);
        }
    });
}


// Fetch customer credit score
function fetchCreditScore() {
    $.ajax({
        url: `${apiUrl}customer`,
        method: 'GET',
        dataType: 'json',
        success: function (data) {
            const customer = data.documents.find(doc => doc.fields.email.stringValue === customerEmail);
            if (customer) {
                creditScore = customer.fields.credit_score.integerValue;
                $('#creditScore').text(`Credit Score: ${creditScore}`);
            } else {
                alert('Customer not found.');
            }
        },
        error: function (error) {
            console.error('Error fetching credit score:', error);
        }
    });
}

// Initialize the cart page
$(document).ready(function () {
    fetchCartItems();
    fetchCreditScore();
    $('#payWithCash').click(payWithCash);
    $('#payWithCredit').click(payWithCreditScore);
});
