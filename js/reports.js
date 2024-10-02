$(document).ready(function () {
    $("#reportTypeDropdown").change(function () {
        const reportType = $(this).val();
        $("#datePickers").hide(); // Initially hide date pickers
        $("#generateReportButton").hide(); // Hide generate button initially

        // Show corresponding report options based on the report type
        if (reportType.includes("Customer")) {
            displayCustomerReportOptions();
        } else if (reportType.includes("Inventory")) {
            displayInventoryReportOptions();
        } else if (reportType.includes("Sales")) {
            displaySalesReportOptions();
        }
        else{
            $("#reportOptions").hide(); // Initially hide date pickers
            $("#datePickers").hide(); // Initially hide date pickers
            $("#generateReportButton").hide(); 
        }
    });

    $("#generateReportButton").click(function () {
        const reportType = $("#reportOptions select").val();
        const fromDate = $("#fromDate").val();
        const toDate = $("#toDate").val();

        // Customer Reports
        if (reportType === "Top 10 Customers") {
            generateTopCustomersReport(fromDate, toDate);
        }else if (reportType === "All") {
            generateAllCustomer();
        }else if (reportType === "Cash Purchase Report") {
            generateCashPurchaseReport(fromDate, toDate);
        } else if (reportType === "Credit Purchase Report") {
            generateCreditPurchaseReport(fromDate, toDate);
        }

        // Inventory Reports
        else if (reportType === "Current Stock") {
            generateInventoryReport();
        }else if (reportType === "CategoryInventory") {
            generateCategoryWiseInventoryReport();
        } else if (reportType === "High Stock") {
            generateHighStockReport();
        } else if (reportType === "Low Stock") {
            generateLowStockReport();
        }

        // Sales Reports
        else if (reportType === "All Sales") {
            generateSalesReport(fromDate, toDate, 'all');
        } else if (reportType === "Category Wise Sales") {
            generateSalesCategoryReport(fromDate, toDate);
        } else if (reportType === "Cash Wise Sales") {
            generateSalesReport(fromDate, toDate, 'cash');
        } else if (reportType === "Credit Wise Sales") {
            generateSalesReport(fromDate, toDate, 'credit');
        } else if (reportType === "Top 10 Selling Items") {
            generateTopSellingItemsReport(fromDate, toDate);
        } else if (reportType === "Bottom 10 Selling Items") {
            generateBottomSellingItemsReport(fromDate, toDate);
        }
    });
});

// Dynamically show date pickers when necessary for reports

function displayCustomerReportOptions() {
    $("#reportOptions").html(`
        <label for="reportType">Choose Customer Report:</label>
        <select id="reportType">
            <option value="All">All</option>
            <option value="Top 10 Customers">Top 10 Customers</option>
            <option value="Cash Purchase Report">Cash Purchase Report</option>
            <option value="Credit Purchase Report">Credit Purchase Report</option>
        </select>
    `);
    $("#reportOptions").show(); // Initially hide date pickers

    $("#datePickers").show(); // Show date pickers for customer reports
    $("#generateReportButton").show(); // Enable generate button after selection
}

function displaySalesReportOptions() {
    $("#reportOptions").html(`
        <label for="reportType">Choose Sales Report:</label>
        <select id="reportType">
            <option value="All Sales">All Sales</option>
            <option value="Category Wise Sales">Category Wise Sales</option>
            <option value="Cash Wise Sales">Cash Wise Sales</option>
            <option value="Credit Wise Sales">Credit Wise Sales</option>
            <option value="Top 10 Selling Items">Top 10 Selling Items</option>
            <option value="Bottom 10 Selling Items">Bottom 10 Selling Items</option>
        </select>
    `);

    $("#reportOptions").show(); // Initially hide date pickers

    $("#datePickers").show(); // Show date pickers for sales reports
    $("#generateReportButton").show(); // Enable generate button after selection
}

function displayInventoryReportOptions() {
    $("#reportOptions").html(`
        <label for="reportType">Choose Inventory Report:</label>
        <select id="reportType">
            <option value="Current Stock">Current Stock</option>            
            <option value="CategoryInventory">Category wise</option>
            <option value="High Stock">High Stock</option>
            <option value="Low Stock">Low Stock</option>
        </select>
    `);
    $("#reportOptions").show(); // Initially hide date pickers

    $("#datePickers").hide(); // No need for date selection for inventory reports
    $("#generateReportButton").show(); // Enable generate button after selection
}

// Report Generation Functions (Customer, Inventory, Sales)

function generateTopCustomersReport(fromDate, toDate) {
    $.ajax({
        url:  `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/order_history`,
        type: 'GET',
        success: function (response) {
            let customers = [];
            response.documents.forEach(doc => {
                const customerEmail = doc.name.split('/').pop(); // Extract the email ID (document ID)
                const orders = doc.fields.orders.arrayValue.values.filter(order => {
                    const date = new Date(order.mapValue.fields.date.stringValue);
                    return date >= new Date(fromDate) && date <= new Date(toDate);
                });
                const totalAmount = orders.reduce((sum, order) => sum + parseInt(order.mapValue.fields.amount.integerValue,10), 0);
                if (orders.length > 0) {
                    customers.push({ email: customerEmail, totalAmount });
                }
            });

            // Sort customers by total amount in descending order and take the top 10
            customers = customers.sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 10);

            // Generate the CSV content
            let csvContent = "data:text/csv;charset=utf-8,Email,Total Amount\n";
            customers.forEach(cust => {
                csvContent += `${cust.email},${cust.totalAmount}\n`;
            });

            downloadCSV(csvContent, 'top_10_customers.csv');
        },
        error: function (error) {
            console.error("Error fetching customer report data:", error);
        }
    });
}
function generateAllCustomer(){
    $.ajax({
        url:  `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/order_history`,
        type: 'GET',
        success: function (response) {
            let customers = [];
            response.documents.forEach(doc => {
                const customerEmail = doc.name.split('/').pop(); // Extract the email ID (document ID)
                const orders = doc.fields.orders.arrayValue.values;
                const totalAmount = orders.reduce((sum, order) => sum + parseInt(order.mapValue.fields.amount.integerValue,10), 0);
                if (orders.length > 0) {
                    customers.push({ email: customerEmail, totalAmount });
                }
            });


            // Generate the CSV content
            let csvContent = "data:text/csv;charset=utf-8,Email,Total Amount\n";
            customers.forEach(cust => {
                csvContent += `${cust.email},${cust.totalAmount}\n`;
            });

            downloadCSV(csvContent, 'all_customers.csv');
        },
        error: function (error) {
            console.error("Error fetching customer report data:", error);
        }
    });
}
function generateCashPurchaseReport(fromDate, toDate) {
    $.ajax({
        url: `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/order_history`,
        type: 'GET',
        success: function (response) {
            let customers = [];
            response.documents.forEach(doc => {
                const customerEmail = doc.name.split('/').pop(); // Extract the email ID (document ID)
                const orders = doc.fields.orders.arrayValue.values.filter(order => {
                    const date = new Date(order.mapValue.fields.date.stringValue);
                    const paymentMethod = order.mapValue.fields.paymentMethod.stringValue;
                    return date >= new Date(fromDate) && date <= new Date(toDate) && paymentMethod === 'cash';
                });

                const totalAmount = orders.reduce((sum, order) => sum + parseInt(order.mapValue.fields.amount.integerValue, 10), 0);

                if (orders.length > 0) {
                    customers.push({ email: customerEmail, totalAmount });
                }
            });

            // Sort customers by total amount in descending order
            customers = customers.sort((a, b) => b.totalAmount - a.totalAmount);

            // Generate CSV content
            let csvContent = "data:text/csv;charset=utf-8,Email,Total Cash Amount\n";
            customers.forEach(cust => {
                csvContent += `${cust.email},${cust.totalAmount}\n`;
            });

            // Download the CSV
            downloadCSV(csvContent, 'cash_purchase_report.csv');
        },
        error: function (error) {
            console.error("Error fetching cash purchase report data:", error);
        }
    });
}

function generateCreditPurchaseReport(fromDate, toDate) {
    $.ajax({
        url: `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/order_history`,
        type: 'GET',
        success: function (response) {
            let customers = [];
            response.documents.forEach(doc => {
                const customerEmail = doc.name.split('/').pop(); // Extract the email ID (document ID)
                const orders = doc.fields.orders.arrayValue.values.filter(order => {
                    const date = new Date(order.mapValue.fields.date.stringValue);
                    const paymentMethod = order.mapValue.fields.paymentMethod.stringValue;
                    return date >= new Date(fromDate) && date <= new Date(toDate) && paymentMethod === 'credit';
                });

                const totalAmount = orders.reduce((sum, order) => sum + parseInt(order.mapValue.fields.amount.integerValue, 10), 0);

                if (orders.length > 0) {
                    customers.push({ email: customerEmail, totalAmount });
                }
            });

            // Sort customers by total amount in descending order
            customers = customers.sort((a, b) => b.totalAmount - a.totalAmount);

            // Generate CSV content
            let csvContent = "data:text/csv;charset=utf-8,Email,Total Credit Amount\n";
            customers.forEach(cust => {
                csvContent += `${cust.email},${cust.totalAmount}\n`;
            });

            // Download the CSV
            downloadCSV(csvContent, 'credit_purchase_report.csv');
        },
        error: function (error) {
            console.error("Error fetching credit purchase report data:", error);
        }
    });
}


function generateInventoryReport() {
    $.ajax({
        url:  `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/inventory`,
        type: 'GET',
        success: function (response) {
            let csvContent = "data:text/csv;charset=utf-8,Item Name,Available Quantity\n";
            response.documents.forEach(item => {
                const itemName = item.fields.item_name.stringValue;
                const quantity = item.fields.qty.integerValue;
                csvContent += `${itemName},${quantity}\n`;
            });
            downloadCSV(csvContent, 'current_inventory_report.csv');
        },
        error: function (error) {
            console.error("Error generating inventory report:", error);
        }
    });
}
function generateCategoryWiseInventoryReport() {
    // Step 1: Fetch categories from the category table
    $.ajax({
        url: `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/category`,
        type: 'GET',
        success: function (categoryResponse) {
            // Create a map of category_id to category_name
            const categoryMap = {};
            categoryResponse.documents.forEach(category => {
                const categoryId = category.fields.category_id.integerValue;
                const categoryName = category.fields.name.stringValue;
                categoryMap[categoryId] = categoryName;
            });

            // Step 2: Fetch inventory from the inventory table
            $.ajax({
                url: `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/inventory`,
                type: 'GET',
                success: function (inventoryResponse) {
                    let csvContent = "data:text/csv;charset=utf-8,Item Name,Category Name,Available Quantity\n";

                    inventoryResponse.documents.forEach(item => {
                        const itemName = item.fields.item_name.stringValue;
                        const quantity = item.fields.qty.integerValue;
                        const categoryId = item.fields.cat_id.integerValue;

                        // Step 3: Get the corresponding category_name from categoryMap using cat_id
                        const categoryName = categoryMap[categoryId] ? categoryMap[categoryId] : 'Unknown Category';

                        // Append to CSV content
                        csvContent += `${itemName},${categoryName},${quantity}\n`;
                    });

                    // Step 4: Download the CSV file
                    downloadCSV(csvContent, 'category_wise_inventory_report.csv');
                },
                error: function (error) {
                    console.error("Error generating inventory report:", error);
                }
            });
        },
        error: function (error) {
            console.error("Error fetching category data:", error);
        }
    });
}

function generateHighStockReport() {
    // Fetch inventory from the inventory table
    $.ajax({
        url: `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/inventory`,
        type: 'GET',
        success: function (inventoryResponse) {
            let csvContent = "data:text/csv;charset=utf-8,Item Name,Available Quantity\n";
            
            inventoryResponse.documents.forEach(item => {
                const itemName = item.fields.item_name.stringValue;
                const quantity = item.fields.qty.integerValue;
                
                // Check if the item has more than 100 units
                if (quantity > 100) {
                    csvContent += `${itemName},${quantity}\n`;
                }
            });

            // Download the CSV file for high stock items
            downloadCSV(csvContent, 'high_stock_report.csv');
        },
        error: function (error) {
            console.error("Error generating high stock report:", error);
        }
    });
}

function generateLowStockReport() {
    // Fetch inventory from the inventory table
    $.ajax({
        url: `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/inventory`,
        type: 'GET',
        success: function (inventoryResponse) {
            let csvContent = "data:text/csv;charset=utf-8,Item Name,Available Quantity\n";
            
            inventoryResponse.documents.forEach(item => {
                const itemName = item.fields.item_name.stringValue;
                const quantity = item.fields.qty.integerValue;
                
                // Check if the item has less than 15 units
                if (quantity < 15) {
                    csvContent += `${itemName},${quantity}\n`;
                }
            });

            // Download the CSV file for low stock items
            downloadCSV(csvContent, 'low_stock_report.csv');
        },
        error: function (error) {
            console.error("Error generating low stock report:", error);
        }
    });
}

function generateSalesReport(fromDate, toDate, str) {
    $.ajax({
        url: `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/order_history`,
        method: 'GET',
        success: function (response) {
            let csvContent = "data:text/csv;charset=utf-8,Email,Amount,Payment Method,Date\n";

            response.documents.forEach(doc => {
                const customerEmail = doc.name.split('/').pop(); // Extract email as document ID
                const orders = doc.fields.orders.arrayValue.values;

                orders.forEach(order => {
                    const date = new Date(order.mapValue.fields.date.stringValue);
                    const paymentMethod = order.mapValue.fields.paymentMethod.stringValue;
                    const amount = order.mapValue.fields.amount.integerValue;

                    // Filter based on payment method and date range
                    if (date >= new Date(fromDate) && date <= new Date(toDate)) {
                        if (str === 'all' || paymentMethod === str) {
                            csvContent += `${customerEmail},${amount},${paymentMethod},${date.toLocaleDateString()}\n`;
                        }
                    }
                });
            });

            downloadCSV(csvContent, `sales_report_${str}.csv`);
        },
        error: function (error) {
            console.error("Error generating sales report:", error);
        }
    });
}
function generateSalesCategoryReport(fromDate, toDate) {
    // Step 1: Fetch all inventory data to get item details including category
    $.ajax({
        url: `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/inventory`,
        method: 'GET',
        dataType: 'json',
        success: function (inventoryData) {
            let inventoryMap = {}; // Store item_id to category mapping
            inventoryData.documents.forEach(item => {
                const itemId = item.fields.item_id.integerValue;
                const catId = item.fields.cat_id.integerValue;
                const price = item.fields.price.doubleValue || item.fields.price.integerValue;
                
                inventoryMap[itemId] = {
                    catId: catId,
                    price: parseInt(price,10)
                };
            });

            // Step 2: Fetch all category data to get category names
            $.ajax({
                url: `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/category`,
                method: 'GET',
                dataType: 'json',
                success: function (categoryData) {
                    let categoryMap = {}; // Store category_id to category_name mapping
                    categoryData.documents.forEach(category => {
                        const categoryId = category.fields.category_id.integerValue;
                        const categoryName = category.fields.name.stringValue;

                        categoryMap[categoryId] = categoryName;
                    });

                    // Step 3: Fetch all order history data to calculate sales per category
                    $.ajax({
                        url: `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/order_history`,
                        method: 'GET',
                        dataType: 'json',
                        success: function (orderHistoryData) {
                            let categorySales = {}; // Store sales per category

                            orderHistoryData.documents.forEach(doc => {
                                const orders = doc.fields.orders.arrayValue.values;

                                orders.forEach(order => {
                                    const date = new Date(order.mapValue.fields.date.stringValue);
                                    if (date >= new Date(fromDate) && date <= new Date(toDate)) {
                                        const items = order.mapValue.fields.items.arrayValue.values;

                                        items.forEach(item => {
                                            const itemId = item.mapValue.fields.itemId.integerValue;
                                            const quantity = parseInt(item.mapValue.fields.quantity.integerValue,10);

                                            // Find item in the inventory and get the category ID and price
                                            if (inventoryMap[itemId]) {
                                                const catId = inventoryMap[itemId].catId;
                                                const price = inventoryMap[itemId].price;
                                                const totalAmount = price * quantity;

                                                // Find category name
                                                const categoryName = categoryMap[catId] || 'Unknown Category';

                                                // Add to category sales
                                                if (!categorySales[categoryName]) {
                                                    categorySales[categoryName] = 0;
                                                }
                                                categorySales[categoryName] += totalAmount;
                                            }
                                        });
                                    }
                                });
                            });

                            // Step 4: Generate CSV from category sales data
                            let csvContent = "data:text/csv;charset=utf-8,Category,Total Sales Amount\n";
                            Object.keys(categorySales).forEach(category => {
                                csvContent += `${category},${categorySales[category]}\n`;
                            });

                            // Download the CSV file
                            downloadCSV(csvContent, 'sales_by_category.csv');
                        },
                        error: function (error) {
                            console.error('Error fetching order history data:', error);
                        }
                    });
                },
                error: function (error) {
                    console.error('Error fetching category data:', error);
                }
            });
        },
        error: function (error) {
            console.error('Error fetching inventory data:', error);
        }
    });
}
function generateTopSellingItemsReport(fromDate, toDate) {
    $.ajax({
        url: `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/order_history`,
        method: 'GET',
        success: function (response) {
            let itemSales = {};

            response.documents.forEach(doc => {
                const orders = doc.fields.orders.arrayValue.values;

                orders.forEach(order => {
                    const date = new Date(order.mapValue.fields.date.stringValue);
                    if (date >= new Date(fromDate) && date <= new Date(toDate)) {
                        const items = order.mapValue.fields.items.arrayValue.values;

                        items.forEach(item => {
                            const itemId = item.mapValue.fields.itemId.integerValue;
                            const quantity = parseInt(item.mapValue.fields.quantity.integerValue,10);

                            if (!itemSales[itemId]) {
                                itemSales[itemId] = 0;
                            }
                            itemSales[itemId] += quantity; // Accumulate quantity sold for each item
                        });
                    }
                });
            });

            // Sort items by total quantity sold in descending order and take the top 10
            const topSellingItems = Object.entries(itemSales)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10);

            // Fetch item details from inventory
            $.ajax({
                url: `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/inventory`,
                method: 'GET',
                success: function (inventoryResponse) {
                    let csvContent = "data:text/csv;charset=utf-8,Item Name,Quantity Sold\n";

                    topSellingItems.forEach(([itemId, quantity]) => {
                        const item = inventoryResponse.documents.find(doc => doc.fields.item_id.integerValue == itemId);
                        const itemName = item ? item.fields.item_name.stringValue : "Unknown Item";
                        csvContent += `${itemName},${quantity}\n`;
                    });

                    downloadCSV(csvContent, 'top_10_selling_items.csv');
                },
                error: function (error) {
                    console.error("Error fetching inventory data:", error);
                }
            });
        },
        error: function (error) {
            console.error("Error generating top selling items report:", error);
        }
    });
}
function generateBottomSellingItemsReport(fromDate, toDate) {
    $.ajax({
        url: `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/order_history`,
        method: 'GET',
        success: function (response) {
            let itemSales = {};

            response.documents.forEach(doc => {
                const orders = doc.fields.orders.arrayValue.values;

                orders.forEach(order => {
                    const date = new Date(order.mapValue.fields.date.stringValue);
                    if (date >= new Date(fromDate) && date <= new Date(toDate)) {
                        const items = order.mapValue.fields.items.arrayValue.values;

                        items.forEach(item => {
                            const itemId = item.mapValue.fields.itemId.integerValue;
                            const quantity = parseInt(item.mapValue.fields.quantity.integerValue,10);

                            if (!itemSales[itemId]) {
                                itemSales[itemId] = 0;
                            }
                            itemSales[itemId] += quantity; // Accumulate quantity sold for each item
                        });
                    }
                });
            });

            // Sort items by total quantity sold in ascending order and take the bottom 10
            const bottomSellingItems = Object.entries(itemSales)
                .sort(([, a], [, b]) => a - b)
                .slice(0, 10);

            // Fetch item details from inventory
            $.ajax({
                url: `https://firestore.googleapis.com/v1/projects/online-store-95b4f/databases/(default)/documents/inventory`,
                method: 'GET',
                success: function (inventoryResponse) {
                    let csvContent = "data:text/csv;charset=utf-8,Item Name,Quantity Sold\n";

                    bottomSellingItems.forEach(([itemId, quantity]) => {
                        const item = inventoryResponse.documents.find(doc => doc.fields.item_id.integerValue == itemId);
                        const itemName = item ? item.fields.item_name.stringValue : "Unknown Item";
                        csvContent += `${itemName},${quantity}\n`;
                    });

                    downloadCSV(csvContent, 'bottom_10_selling_items.csv');
                },
                error: function (error) {
                    console.error("Error fetching inventory data:", error);
                }
            });
        },
        error: function (error) {
            console.error("Error generating bottom selling items report:", error);
        }
    });
}

// CSV Download Logic
function downloadCSV(csvContent, fileName) {
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
