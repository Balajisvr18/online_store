const apiUrl = ENV.API_URL; // Get API URL directly from config.js
const email = sessionStorage.getItem('customerEmail');

// On document ready
$(document).ready(function () {
    $('#cartBtn').click(cartPageRedirect);
    $('#orderHistoryBtn').click(ordersPageRedirect);

    // Fetch items with availability true
    fetchAvailableItems();

    // Handle search bar input
    $('#searchBar').on('input', function () {
        const searchTerm = $(this).val().toLowerCase();
        const filteredItems = allItems.filter(item => {
            const name = item.fields.item_name.stringValue.toLowerCase();
            const description = item.fields.des.stringValue.toLowerCase();
            return name.includes(searchTerm) || description.includes(searchTerm);
        });
        displayItems(filteredItems);
    });

    // Fetch categories and populate dropdown
    fetchCategories();
// Handle category dropdown change
$('#categoryDropdown').on('change', function () {
    const selectedCategoryName = $(this).val();
    
    // Get the category_id from the categoryMap based on the selected category name
    const selectedCategoryId = categoryMap[selectedCategoryName];

    if (selectedCategoryId) {
        // Filter items by the selected category_id
        const filteredItems = allItems.filter(item => item.fields.cat_id.integerValue == selectedCategoryId);
        displayItems(filteredItems);
    } else {
        displayItems(allItems); // Show all items if no category is selected
    }
});

let categoryMap = {}; // To store category_name and category_id

// Fetch categories and populate the dropdown
function fetchCategories() {
    $.ajax({
        url: `${apiUrl}category`,
        method: 'GET',
        success: function (data) {
            const categories = data.documents.map(doc => {
                const categoryId = doc.fields.category_id.integerValue;
                const categoryName = doc.fields.name.stringValue;
                
                // Store category name and id in the categoryMap object
                categoryMap[categoryName] = categoryId;

                return `<option value="${categoryName}">${categoryName}</option>`;
            });

            // Append categories to dropdown
            $('#categoryDropdown').append(categories);
        },
        error: function () {
            alert('Error fetching categories.');
        }
    });
}
    // Cart and order history logic can be handled later
});
let currentPage = 1; // Track the current page
const itemsPerPage = 5; // Set items per page
let allItems = []; // Store all fetched items

// Fetch available items with availability set to true
function fetchAvailableItems() {
    $.ajax({
        url: `${apiUrl}inventory`, // API endpoint for fetching inventory items
        method: 'GET',
        dataType: 'json',
        success: function (data) {
            // Filter out items where availability is false
            allItems = data.documents.filter(item => item.fields.availability.booleanValue === true);
            displayItems(allItems); // Display available items with pagination
        },
        error: function (error) {
            console.error('Error fetching items:', error);
            alert('Error fetching available items.');
        }
    });
}

// Function to render pagination controls
function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const paginationHtml = `
        <div id="pagination">
            <button id="prevPage" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
            <span> Page ${currentPage} of ${totalPages} </span>
            <button id="nextPage" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        </div>
    `;

    $('#paginationContainer').html(paginationHtml);

    // Add click event handlers for pagination buttons
    $('#prevPage').off('click').on('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayItems(allItems); // Refresh item display for the new page
        }
    });

    $('#nextPage').off('click').on('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayItems(allItems); // Refresh item display for the new page
        }
    });
}


// Function to display paginated items as cards
function displayItems(items) {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const itemsToDisplay = items.slice(start, end);

    const itemsHtml = itemsToDisplay.map(item => {
        const itemId = item.fields.item_id.integerValue;
        const itemName = item.fields.item_name.stringValue;
        const description = item.fields.des ? item.fields.des.stringValue : 'No description available';
        const price = item.fields.price.doubleValue || item.fields.price.integerValue;
        const quantityAvailable = item.fields.qty.integerValue;
        const imageUrl = item.fields.image ? `data:image/png;base64,${item.fields.image.stringValue}` : ''; // Image URL or Base64

        return `
            <div class="card">
                <img src="${imageUrl}" alt="${itemName}">
                <h4>${itemName}</h4>
                <p>${description}</p>
                <p>Price: $${price}</p>
                <p>Available: ${quantityAvailable}</p>
                <button onclick="addToCart(${itemId})">Add to Cart</button>
            </div>
        `;
    }).join('');

    $('#itemsContainer').html(itemsHtml);

    // Render pagination controls
    renderPagination(items.length);
}
function addToCart(itemId) {
    
    // Fetch the current cart from Firestore
    $.ajax({
        url: `${apiUrl}cart/${email}`,
        method: 'GET',
        success: function (response) {
            let cart = [];
            if (
                response.fields &&
                response.fields.items &&
                response.fields.items.arrayValue &&
                response.fields.items.arrayValue.values &&
                Array.isArray(response.fields.items.arrayValue.values) // Ensure it's an array
            ) {
                // Map the current cart items into a usable array
                cart = response.fields.items.arrayValue.values.map(item => ({
                    itemId: item.mapValue.fields.itemId.integerValue,
                    quantity: parseInt(item.mapValue.fields.quantity.integerValue, 10) // Ensure quantity is treated as an integer
                }));
            }

            // Check if the product is already in the cart
            const productIndex = cart.findIndex(item => item.itemId === itemId);

            if (productIndex === -1) {
                // Product not in cart, add it with default quantity 1
                cart.push({ itemId: itemId, quantity: 1 });
                alert('Product added to cart!');

                // Prepare the cart to be updated in Firestore
                const updatedCart = cart.map(item => ({
                    mapValue: {
                        fields: {
                            itemId: { integerValue: item.itemId },
                            quantity: { integerValue: item.quantity }
                        }
                    }
                }));

                // Update the cart in Firestore
                $.ajax({
                    url: `${apiUrl}cart/${email}?updateMask.fieldPaths=items`,
                    method: 'PATCH',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        fields: {
                            items: {
                                arrayValue: {
                                    values: updatedCart
                                }
                            }
                        }
                    }),
                    success: function () {
                        console.log('Cart updated successfully');
                    },
                    error: function (error) {
                        console.error('Error updating cart:', error);
                    }
                });
            } else {
                // Product already exists in cart
                alert(`Product with item ID ${itemId} already exists in cart.`);
            }
        },
        error: function (error) {
            // Handle case where the document is not found (404)
            if (error.status === 404) {
                console.log("Cart document not found. Creating a new one...");

                // Create the cart document with the product and default quantity 1
                const cart = [
                    {
                        mapValue: {
                            fields: {
                                itemId: { integerValue: itemId },
                                quantity: { integerValue: 1 }
                            }
                        }
                    }
                ];

                // Create a new document in the cart collection for this user
                $.ajax({
                    url: `${apiUrl}cart/${email}`,
                    method: 'PATCH',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        fields: {
                            items: {
                                arrayValue: {
                                    values: cart
                                }
                            }
                        }
                    }),
                    success: function () {
                        alert('Cart created and product added!');
                    },
                    error: function (error) {
                        console.error('Error creating cart:', error);
                    }
                });
            } else {
                console.error('Error fetching cart:', error);
            }
        }
    });
}


function cartPageRedirect() {
    window.location.href = 'cart.html'; // Redirect to customer page
}
function ordersPageRedirect() {
    window.location.href = 'orders.html'; // Redirect to customer page
}