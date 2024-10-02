const apiUrl = ENV.API_URL; // Get API URL directly from config.js
$(document).ready(function() {
    $('#createItemBtn').click(function() {
        clearPreviousDisplays();
        showCreateItemForm();
    });
    $('#readItemsBtn').click(function() {
        clearPreviousDisplays();
        fetchAllItems();
    });
    $('#readByCategoryBtn').click(function() {
        clearPreviousDisplays();
        fetchCategoryItems();
    });
    $('#readByNameBtn').click(function() {
        clearPreviousDisplays();
        fetchItem();
    });
    $('#updateItemBtn').click(function() {
        clearPreviousDisplays();
        updateItem();
    });
    $('#deleteItemBtn').click(function() {
        clearPreviousDisplays();
        showDeleteItemForm();
    });
    $('#editCreditBtn').click(function() {
        clearPreviousDisplays();
        editCreditScore();
    });
    $('#reportsBtn').click(function() {
        clearPreviousDisplays();
        $('#reportTypeSection').show(); // Show the report section
    });
});

// Helper function to clear previous displays
function clearPreviousDisplays() {
    $('#formContainer').empty();
    $('#itemsList').empty();
    $('#paginationContainer').empty();
    $("#reportTypeSection").hide();

    $("#reportOptions").hide(); // Initially hide date pickers

    $("#datePickers").hide(); // Show date pickers for sales reports
    $("#generateReportButton").hide();
}

function showCreateItemForm() {
    // Fetch categories and populate dropdown
    fetchCategories().then(categories => {
        const categoryOptions = categories.map(category => `
            <option value="${category.category_id}">${category.name}</option>
        `).join('');

        const formHtml = `
            <h3>Create Item</h3>
            <form id="createItemForm" enctype="multipart/form-data">
                <label for="cat_id">Category:</label>
                <select id="cat_id" required>
                    ${categoryOptions}
                </select>

                <label for="title">Title:</label>
                <input type="text" id="title" required>

                <label for="des">Description:</label>
                <input type="text" id="des" required>

                <label for="qty">Quantity:</label>
                <input type="number" id="qty" required>

                <label for="price">Price:</label>
                <input type="number" id="price" required>

                <label for="image">Image (.png or .jpg):</label>
                <input type="file" id="image" accept=".png, .jpg" required>

                <button type="submit">Create Item</button>
            </form>
        `;

        $('#formContainer').html(formHtml);
        $('#createItemForm').submit(createItem); // Bind the form submission handler
    }).catch(error => {
        alert('Error fetching categories. Please try again later.');
    });
}

// Fetch categories from the category table
function fetchCategories() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${apiUrl}category`, // Fetch all categories from the API
            method: 'GET',
            success: function (data) {
                const categories = data.documents.map(doc => ({
                    category_id: doc.fields.category_id.integerValue,
                    name: doc.fields.name.stringValue
                }));
                resolve(categories);
            },
            error: function (error) {
                console.error('Error fetching categories:', error);
                reject('Failed to load categories.');
            }
        });
    });
}

// Create item function
async function createItem(event) {
    event.preventDefault();
    $('#itemsList').empty();
    $('#paginationContainer').empty();

    const categoryId = $('#cat_id').val();
    const imageFile = $('#image')[0].files[0]; // Get the image file

    try {
            const newItemId = await getNewId(apiUrl, 'item_counter');

            // Convert image to Base64
            const imageBase64 = await convertToBase64(imageFile);
            
            // Create item in the inventory with the Base64 image
            createItemInInventory(newItemId, categoryId, imageBase64); 
        
    } catch (error) {
        alert(error);
    }
}

// Function to convert the image file to a Base64 string
function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result.split(',')[1]); // Return only the Base64 string without metadata
        };
        reader.onerror = () => {
            reject("Error converting file to Base64");
        };
        reader.readAsDataURL(file);
    });
}

// Function to create the item in the inventory
function createItemInInventory(itemId, categoryId, imageBase64) {
    const itemName = $('#title').val();
    const des = $('#des').val();
    const qty = $('#qty').val();
    const price = $('#price').val();

    // Create item in inventory with the new item_id and image
    $.ajax({
        url: `${apiUrl}inventory`, // Adjust endpoint as needed
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            fields: {
                item_id: { integerValue: itemId },
                item_name: { stringValue: itemName },
                des: { stringValue: des },
                qty: { integerValue: qty },
                price: { doubleValue: parseFloat(price) }, // Ensure price is a float
                availability: { booleanValue: true },
                cat_id: { integerValue: categoryId },
                image: { stringValue: imageBase64 } // Add the Base64 image string here
            }
        }),
        success: function() {
            alert('Item created successfully!');
            $('#formContainer').empty(); // Clear the form
        },
        error: function() {
            alert('Error creating item. Please try again.');
        }
    });
}


// Function to get the next item ID from the counter
async function getNewId(apiUrl, counterName) {
    let newId = 0;
    await $.ajax({
        url: `${apiUrl}Counters/${counterName}`,
        method: 'GET',
        async: false,
        success: async function(data) {
            newId = parseInt(data.fields.item_id.integerValue); // Changed from customer_id to item_id
            // Increment the counter
            await $.ajax({
                url: `${apiUrl}Counters/${counterName}`,
                method: 'PATCH',
                contentType: 'application/json',
                data: JSON.stringify({
                    fields: {
                        item_id: { integerValue: ++newId }
                    }
                })
            });
        }
    });
    return newId;
}


let currentPage = 1; // Track the current page
const itemsPerPage = 3; // Set items per page
let allItems = []; // Store all fetched items

// Display items with pagination as cards
function displayItems() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const itemsToDisplay = allItems.slice(start, end);

    const itemsHtml = itemsToDisplay.map(item => {
        const itemName = item.fields.item_name ? item.fields.item_name.stringValue : 'N/A';
        const itemId = item.fields.item_id ? item.fields.item_id.integerValue : 'N/A'; // Show item_id
        const categoryId = item.fields.cat_id ? item.fields.cat_id.integerValue : 'N/A'; // Category ID
        const description = item.fields.des ? item.fields.des.stringValue : 'N/A'; // Description
        const quantity = item.fields.qty ? item.fields.qty.integerValue : 'N/A'; // Quantity
        const price = item.fields.price ? (item.fields.price.doubleValue || item.fields.price.integerValue) : 'N/A'; // Price
        const availability = item.fields.availability ? item.fields.availability.booleanValue : 'N/A'; // Availability
        const imageUrl = item.fields.image ? `data:image/png;base64,${item.fields.image.stringValue}` : ''; // Image URL or Base64 string

        return `
            <div class="card">
                <img src="${imageUrl}" alt="${itemName}" class="card-img" width="50" height="50"/> <!-- Display item image -->
                <div class="card-content">
                    <h4>${itemName} (ID: ${itemId})</h4>
                    <p>Category ID: ${categoryId}</p>
                    <p>Description: ${description}</p>
                    <p>Quantity: ${quantity}</p>
                    <p>Price: $${price}</p>
                    <p>Availability: ${availability ? 'Available' : 'Unavailable'}</p>
                </div>
            </div>
        `;
    }).join('');

    $('#itemsList').html(itemsHtml); // Render items as cards

    // Render pagination controls
    renderPagination();
}

// Function to render pagination controls
function renderPagination() {
    const totalPages = Math.ceil(allItems.length / itemsPerPage); // Calculate total pages

    const paginationHtml = `
        <div id="pagination">
            <button id="prevPage" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
            <span> Page ${currentPage} of ${totalPages} </span>
            <button id="nextPage" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        </div>
    `;

    $('#paginationContainer').html(paginationHtml); // Render pagination

    // Add click event handlers for pagination buttons
    $('#prevPage').off('click').on('click', () => {
        if (currentPage > 1) {
            currentPage--; // Decrease the current page
            displayItems(); // Refresh item display for the new page
        }
    });

    $('#nextPage').off('click').on('click', () => {
        if (currentPage < totalPages) {
            currentPage++; // Increase the current page
            displayItems(); // Refresh item display for the new page
        }
    });
}

// Fetch all items
function fetchAllItems() {
    $.ajax({
        url: `${apiUrl}inventory`, // Adjust endpoint as needed
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            console.log(data); // Log the data response to inspect its structure
            allItems = data.documents; // Store all fetched items
            displayItems(); // Display the first page of items with pagination
        },
        error: function(error) {
            console.error('Error fetching items:', error);
            alert('Error fetching items. Please try again.');
        }
    });
}

// Function to check if the category exists by name and fetch category ID
function checkCategoryExistsByName(categoryName) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${apiUrl}category`, // Fetch all categories
            method: 'GET',
            success: function(categories) {
                const category = categories.documents.find(doc => {
                    return doc.fields.name.stringValue.toLowerCase() === categoryName.toLowerCase();
                });
                
                if (category) {
                    resolve(category.fields.category_id.integerValue); // Return the category ID
                } else {
                    reject('Category does not exist.');
                }
            },
            error: function() {
                reject('Error fetching category. Please try again.');
            }
        });
    });
}

// Function to fetch items by category ID
function fetchItemsByCategoryId(categoryId) {
    $.ajax({
        url: `${apiUrl}inventory`, // Fetch all items from the inventory
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            const filteredItems = data.documents.filter(doc => {
                return doc.fields.cat_id.integerValue === categoryId;
            });

            if (filteredItems.length > 0) {
                allItems = filteredItems; // Store filtered items
                displayItems(); // Display items with pagination
            } else {
                alert('No items found in this category.');
            }
        },
        error: function() {
            alert('Error fetching items. Please try again.');
        }
    });
}
// Fetch items based on category
function fetchCategoryItems() {
    const formHtml = `
        <form id="fetchCategoryItemsForm">
            <label for="categoryName">Enter Category Name:</label>
            <input type="text" id="categoryName" name="categoryName" required>
            <button type="submit">Fetch Items</button>
        </form>
        <div id="categoryItemsContainer"></div>
    `;

    $('#formContainer').html(formHtml);

    $('#fetchCategoryItemsForm').submit(function (event) {
        event.preventDefault(); // Prevent default form submission
        const categoryName = $('#categoryName').val();

        if (categoryName) {
            $('#fetchCategoryItemsForm').hide();

            checkCategoryExistsByName(categoryName)
                .then(categoryId => {

                    fetchItemsByCategoryId(categoryId); // Fetch items based on the category ID
                })
                .catch(error => {
                    alert(error);
                });
        } else {
            alert('Please enter a valid category name.');
        }
    });
}


// Function to fetch items by name
function fetchItem() {
    const formHtml = `
        <form id="fetchItemForm">
            <label for="itemName">Enter Item Name:</label>
            <input type="text" id="itemName" name="itemName" required>
            <button type="submit">Fetch Item</button>
        </form>
        <div id="itemDetailsContainer"></div>
    `;

    $('#formContainer').html(formHtml);

    $('#fetchItemForm').submit(function (event) {
        event.preventDefault(); // Prevent default form submission
        const itemName = $('#itemName').val();

        if (itemName) {
            $('#fetchItemForm').hide();

            $.ajax({
                url: `${apiUrl}inventory`, // Fetch all items from the inventory
                method: 'GET',
                dataType: 'json',
                success: function(data) {
                    const item = data.documents.find(doc => {
                        return doc.fields.item_name.stringValue.toLowerCase() === itemName.toLowerCase();
                    });

                    if (item) {
                        allItems = [item]; // Set allItems to contain only the found item
                        displayItems(); // Display the item in the card format
                    } else {
                        alert('Item not found.');
                    }
                },
                error: function() {
                    alert('Error fetching items. Please try again.');
                }
            });
        } else {
            alert('Please enter a valid item name.');
        }
    });
}
// Function to handle update item logic
function updateItem() {
    const formHtml = `
        <form id="updateItemSearchForm">
            <label for="itemName">Enter Item Name to Update:</label>
            <input type="text" id="itemName" name="itemName" required>
            <button type="submit">Search Item</button>
        </form>
        <div id="itemUpdateContainer"></div>
    `;

    $('#formContainer').html(formHtml);

    $('#updateItemSearchForm').submit(function (event) {
        event.preventDefault(); // Prevent default form submission
        const itemName = $('#itemName').val();

        if (itemName) {
            // Fetch the item by itemId
            $.ajax({
                url: `${apiUrl}inventory`, // API to get the full list of inventory items
                method: 'GET',
                dataType: 'json',
                success: function (data) {
                    // Find the item based on its name
                    const item = data.documents.find(doc => doc.fields.item_name.stringValue.toLowerCase() == itemName.toLowerCase());

                    if (item) {
                        // Hide the search form after item is found
                        $('#updateItemSearchForm').hide();

                        // Populate form with the existing item data
                        const updateFormHtml = `
                            <h3>Update Item : ${itemName}</h3>
                            <form id="updateItemForm">
                                <label for="newTitle">Title</label>
                                <input type="text" id="newTitle" value="${item.fields.item_name ? item.fields.item_name.stringValue : ''}">
                                
                                <label for="newDes">Description</label>
                                <input type="text" id="newDes" value="${item.fields.des ? item.fields.des.stringValue : ''}">
                                
                                <label for="newQty">Quantity</label>
                                <input type="number" id="newQty" value="${item.fields.qty ? item.fields.qty.integerValue : ''}">
                                
                                <label for="newPrice">Price</label>
                                <input type="number" id="newPrice" step="0.01" value="${item.fields.price ? item.fields.price.doubleValue || item.fields.price.integerValue : ''}">
                                
                                <button type="submit">Update Item</button>
                            </form>
                        `;

                        // Insert the update form into the container
                        $('#itemUpdateContainer').html(updateFormHtml);

                        // Attach the submit event to the update form
                        $('#updateItemForm').on('submit', function (event) {
                            event.preventDefault();

                            // Prepare the updated fields, spreading existing ones and updating only the modified fields
                            const updatedFields = {
                                ...item.fields,  // Retain all other fields like item_id, availability, cat_id, etc.
                                item_name: { stringValue: $('#newTitle').val() },
                                des: { stringValue: $('#newDes').val() },
                                qty: { integerValue: parseInt($('#newQty').val()) },
                                price: { doubleValue: parseFloat($('#newPrice').val()) }
                            };

                            // Get the documentId for the specific item
                            const documentId = item.name.split('/').pop(); // Get the document ID from the Firestore item

                            // Make the PATCH request to update the item in Firestore
                            $.ajax({
                                url: `${apiUrl}inventory/${documentId}`,
                                method: 'PATCH',
                                contentType: 'application/json',
                                data: JSON.stringify({ fields: updatedFields }),
                                success: function () {
                                    alert('Item updated successfully!');
                                    $('#itemUpdateContainer').empty(); // Clear the form after successful update
                                },
                                error: function (error) {
                                    console.error('Error updating item:', error);
                                    alert('Error updating item. Please try again.');
                                }
                            });
                        });
                    } else {
                        alert('Item not found. Please check the Item Name and try again.');
                    }
                },
                error: function (error) {
                    console.error('Error fetching inventory data:', error);
                    alert('Error retrieving item details. Please try again.');
                }
            });
        } else {
            alert('Please enter a valid Item Name.');
        }
    });
}

// Function to handle delete item logic using a form
function showDeleteItemForm() {
    const deleteFormHtml = `
        <form id="deleteForm">
            <label for="itemName">Enter Item Name to Update Availability:</label>
            <input type="text" id="itemName" name="itemName" required><br><br>
            <button type="submit">Check Item</button>
        </form>
        <div id="itemDetails"></div>

    `;

    $('#formContainer').html(deleteFormHtml);

    $('#deleteForm').submit(function (event) {
        event.preventDefault(); // Prevent default form submission

        const itemName = $('#itemName').val().trim();

        if (itemName) {
            // Fetch the item by name
            $.ajax({
                url: `${apiUrl}inventory`,
                method: 'GET',
                dataType: 'json',
                success: function (data) {
                    const item = data.documents.find(doc => doc.fields.item_name.stringValue.toLowerCase() === itemName.toLowerCase());

                    if (item) {
                        // Hide the search form after item is found
                        $('#deleteForm').hide();

                        const availability = item.fields.availability ? item.fields.availability.booleanValue : false;

                        // If the item is found, check the current availability status
                        let availabilityPrompt = '';

                        if (availability) {
                            // Availability is true, so ask to set it to false
                            availabilityPrompt = `
                                <p>Availability: Available</p>
                                <label>Do you want to set availability to <strong>false</strong>?</label><br>
                            `;
                        } else {
                            // Availability is false, ask to set it back to true
                            availabilityPrompt = `
                                <p>Availability: Unavailable</p>
                                <label >Do you want to set availability to <strong>true</strong>?</label><br>
                            `;
                        }

                        // Display the item details and the prompt
                        const itemDetailsHtml = `
                            <p><strong>Item Found:</strong></p>
                            <p>Title: ${item.fields.item_name.stringValue}</p>
                            ${availabilityPrompt}
                            <button type="button" id="submitDelete">Confirm</button>
                        `;
                        $('#itemDetails').html(itemDetailsHtml);

                        // Handle the final confirmation click
                        $('#submitDelete').click(function () {
                            
                                // Update the availability based on the current status
                                const updatedAvailability = !availability; // Toggle the availability
                                const updatedFields = {
                                    ...item.fields,
                                    availability: { booleanValue: updatedAvailability }
                                };

                                const documentId = item.name.split('/').pop();

                                $.ajax({
                                    url: `${apiUrl}inventory/${documentId}`,
                                    method: 'PATCH',
                                    contentType: 'application/json',
                                    data: JSON.stringify({ fields: updatedFields }),
                                    success: function () {
                                        const newStatus = updatedAvailability ? 'true (Available)' : 'false (Unavailable)';
                                        alert(`Item '${item.fields.item_name.stringValue}' availability set to ${newStatus}.`);
                                        $('#formContainer').empty(); // Clear the form
                                    },
                                    error: function (error) {
                                        console.error('Error updating item:', error);
                                        alert('Error updating item availability. Please try again.');
                                    }
                                });
                            
                        });
                    } else {
                        alert(`Item with name '${itemName}' not found. Please try again.`);
                    }
                },
                error: function (error) {
                    console.error('Error fetching inventory data:', error);
                    alert('Error retrieving item details. Please try again.');
                }
            });
        } else {
            alert('Please enter a valid item name.');
        }
    });
}

// Function to fetch all customers and display checkboxes with credit scores
function editCreditScore() {
    $('#formContainer').empty(); // Clear any existing form

    // Fetch all customers from the customer collection
    $.ajax({
        url: `${apiUrl}customer`, // Firestore customer collection
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            // Generate the form HTML with checkboxes for each customer
            let formHtml = `
                <h3>Edit Credit Score</h3>
                <form id="editCreditForm">
                    <div id="customerList">`;

            data.documents.forEach(customer => {
                const customerId = customer.fields.customer_id.integerValue;
                const customerName = customer.fields.name.stringValue;
                const creditScore = customer.fields.credit_score.integerValue;

                // Create a checkbox and display customer name and credit score
                formHtml += `
                    <div class="checkbox-container">
                        <input type="checkbox" name="customerCheckbox" value="${customerId}" id="customer_${customerId}">
                        <label for="customer_${customerId}">${customerName} - Credit Score: ${creditScore}</label>
                    </div>`;
            });

            formHtml += `
                    </div>
                    <label for="newCreditScore">Enter New Credit Score:</label>
                    <input type="number" id="newCreditScore" name="newCreditScore" required>
                    <button type="submit">Submit</button>
                </form>`;

            $('#formContainer').html(formHtml); // Append the form to the page

            // Attach event listener to submit the form
            $('#editCreditForm').on('submit', submitCreditScoreUpdate);
        },
        error: function(error) {
            console.error('Error fetching customers:', error);
            alert('Error fetching customer data.');
        }
    });
}

// Function to handle credit score update submission
function submitCreditScoreUpdate(event) {
    event.preventDefault(); // Prevent default form submission
    $('#formContainer').empty();

    const newCreditScore = $('#newCreditScore').val();
    const selectedCustomers = $("input[name='customerCheckbox']:checked"); // Get all selected checkboxes

    if (selectedCustomers.length === 0) {
        alert('Please select at least one customer.');
        return;
    }

    selectedCustomers.each(function() {
        const customerId = $(this).val();

        // Fetch the current customer details to preserve existing data
        $.ajax({
            url: `${apiUrl}customer`, // Fetch individual customer by ID
            method: 'GET',
            dataType: 'json',
            success: function(data) {
                const customerData = data.documents.find(doc => doc.fields.customer_id.integerValue === customerId);

                const documentId = customerData.name.split('/').pop(); // Get the document ID from Firestore
                const customerFields = customerData.fields;

                // Prepare updated fields with the new credit score
                const updatedFields = {
                    ...customerFields,  // Retain existing fields
                    credit_score: { integerValue: parseInt(newCreditScore) } // Update only the credit score
                };

                // Update the customer details in Firestore
                $.ajax({
                    url: `${apiUrl}customer/${documentId}`, // Update individual customer by document ID
                    method: 'PATCH',
                    contentType: 'application/json',
                    data: JSON.stringify({ fields: updatedFields }),
                    success: function() {
                        console.log(`Customer ${customerId} credit score updated.`);
                    },
                    error: function(error) {
                        console.error('Error updating customer credit score:', error);
                        alert('Error updating credit score for customer ID ' + customerId);
                    }
                });
            },
            error: function(error) {
                console.error('Error fetching customer details:', error);
                alert('Error fetching customer details for customer ID ' + customerId);
            }
        });
    });

    alert('Selected customers have been updated with the new credit score.');
    $('#formContainer').empty(); // Clear the form after submission
}

