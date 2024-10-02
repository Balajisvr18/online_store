const apiUrl = ENV.API_URL; // Get API URL directly from config.js
const customerEmail = sessionStorage.getItem('customerEmail'); // Get the current customer email
let currentPage = 1;
const ordersPerPage = 1; // Set orders per page
let allOrders = []; // Store all orders

// Fetch order history for the current customer
function fetchOrderHistory() {
    $.ajax({
        url: `${apiUrl}order_history/${customerEmail}`,
        method: 'GET',
        dataType: 'json',
        success: function (orderData) {
            if (orderData.fields && orderData.fields.orders) {
                allOrders = orderData.fields.orders.arrayValue.values.map(order => ({
                    items: order.mapValue.fields.items.arrayValue.values.map(item => ({
                        itemId: item.mapValue.fields.itemId.integerValue,
                        quantity: item.mapValue.fields.quantity.integerValue
                    })),
                    amount: order.mapValue.fields.amount.integerValue,
                    date: order.mapValue.fields.date.stringValue,
                    paymentMethod: order.mapValue.fields.paymentMethod.stringValue
                }));
                displayOrdersWithPagination(); // Display orders
            } else {
                $('#ordersContainer').html('<p>No orders found.</p>');
            }
        },
        error: function (error) {
            console.error('Error fetching order history:', error);
            $('#ordersContainer').html('<p>Error fetching orders.</p>');
        }
    });
}

// Display orders with pagination
function displayOrdersWithPagination() {
    const start = (currentPage - 1) * ordersPerPage;
    const end = start + ordersPerPage;
    const ordersToDisplay = allOrders.slice(start, end);

    const ordersHtml = ordersToDisplay.map(order => {
        const orderDate = new Date(order.date).toLocaleDateString();
        const totalAmount = order.amount;
        const paymentMode=order.paymentMethod
        const itemsHtml = order.items.map(item => {
            const itemId = item.itemId;
            const quantity = item.quantity;

            // Fetch item details from inventory for each item
            return fetchItemDetails(itemId, quantity);
        }).join('');

        return `
            <div class="order-card">
                <div class="order-header">
                    <span>Total Amount: $${totalAmount}      </span>
                    <span>Date: ${orderDate}          </span>
                    <span>Payment Mode: ${paymentMode}</span>
                </div>
                <div class="order-items">
                    ${itemsHtml}
                </div>
            </div>
        `;
    }).join('');

    $('#ordersContainer').html(ordersHtml);
    renderPagination(allOrders.length);
}

// Fetch item details from inventory and return the HTML for each item card, including individual price
function fetchItemDetails(itemId, quantity) {
    let itemHtml = '';
    $.ajax({
        url: `${apiUrl}inventory`,
        method: 'GET',
        dataType: 'json',
        async: false, // To ensure that itemHtml is returned after completion
        success: function (data) {
            const item = data.documents.find(doc => doc.fields.item_id.integerValue === itemId);

            if (item) {
                const itemName = item.fields.item_name.stringValue;
                const description = item.fields.des ? item.fields.des.stringValue : 'No description available';
                const price = item.fields.price.doubleValue || item.fields.price.integerValue;
                const totalPrice = price * quantity;
                const imageUrl = item.fields.image ? `data:image/png;base64,${item.fields.image.stringValue}` : '';

                itemHtml = `
                    <div class="item-card">
                        <img src="${imageUrl}" alt="${itemName}">
                        <h4>${itemName}</h4>
                        <p>${description}</p>
                        <p>Price: $${price}</p>
                        <p>Quantity: ${quantity}</p>
                        <p>Total Price: $${totalPrice}</p>
                    </div>
                `;
            } else {
                itemHtml = `<p>Item not found.</p>`;
            }
        },
        error: function (error) {
            console.error(`Error fetching item details for item ${itemId}:`, error);
            itemHtml = `<p>Error fetching item details.</p>`;
        }
    });

    return itemHtml;
}


// Render pagination controls
function renderPagination(totalOrders) {
    const totalPages = Math.ceil(totalOrders / ordersPerPage);

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
            displayOrdersWithPagination();
        }
    });

    $('#nextPage').off('click').on('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayOrdersWithPagination();
        }
    });
}

// Fetch customer credit score
function fetchCreditScore() {
    $.ajax({
        url: `${apiUrl}customer`, // Fetch customer collection
        method: 'GET',
        dataType: 'json',
        success: function (data) {
            const customer = data.documents.find(doc => doc.fields.email.stringValue === customerEmail);

            if (customer) {
                creditScore = customer.fields.credit_score.integerValue;
                $('#customerCreditScore').text(`Credit Score: ${creditScore}`);
            } else {
                $('#customerCreditScore').text('Credit Score: Not found');
            }
        },
        error: function (error) {
            console.error('Error fetching credit score:', error);
        }
    });
}

// Initialize the orders page
$(document).ready(function () {
    fetchOrderHistory();
    fetchCreditScore();
});
