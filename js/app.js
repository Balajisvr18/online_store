$(document).ready(function () {
    // Ensure the API URL is loaded before any other operation
    const apiUrl = ENV.API_URL; // Get API URL directly from config.js
    const firebaseConfig = {
        apiKey: "AIzaSyCIAQ4voZcKm9nQN7iHk1ofwfVYt4Fhtmw",
        authDomain: "online-store-95b4f.firebaseapp.com",
        projectId: "online-store-95b4f",
        storageBucket: "online-store-95b4f.appspot.com",
        messagingSenderId: "1039587194291",
        appId: "1:1039587194291:web:7fd2efe1146649219547c6",
        measurementId: "G-F6SD2HHBTX"
      };

      firebase.initializeApp(firebaseConfig);

      var db = firebase.firestore();
      var auth = firebase.auth();

    // Sign In Form Submission
    $('#signInForm').submit(function (e) {
        e.preventDefault();
    
        const email = $('#email').val();
        const password = $('#password').val();
    
        // Firebase Authentication to sign in the user
        auth.signInWithEmailAndPassword(email, password)
            .then(function (userCredential) {
                var user = userCredential.user; // Get Firebase user object
    
                // Admin check
                if (email === "lkamala1971@gmail.com") {
                    window.location.href = 'admin.html'; // Redirect to admin page
                } else {
                    // Fetch user details from Firestore to validate login and role
                    db.collection('customer').doc(user.uid).get()
                        .then(function (doc) {
                            if (doc.exists) {
                                // Store email in session and redirect to customer page
                                sessionStorage.setItem('customerEmail', email);
                                window.location.href = 'customer.html';
                            } else {
                                console.error('No such user document!');
                                alert("No user data found.");
                            }
                        })
                        .catch(function (error) {
                            console.error('Error fetching user data:', error);
                            alert('Error fetching user data.');
                        });
                }
            })
            .catch(function (error) {
                alert('Invalid Email or Password!');
                console.error('Error:', error.message);
            });
    });
    // Sign Up Form Submission
$('#googleSignInButton').click(async function (e) {
    e.preventDefault();

    const googleSignInButton = document.getElementById('googleSignInButton');
    googleSignInButton.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();

        auth.signInWithPopup(provider)
            .then((result) => {
                const user = result.user;
                const userEmail = user.email;

                // Check if user exists in Firestore and update or merge data
                const docRef = db.collection('customer').doc(user.uid);
                docRef.set({
                    email: user.email,
                    firstName: user.displayName.split(' ')[0],  // Use Google's displayName
                    lastName: user.displayName.split(' ')[1] || '', // Last name might be absent
                    mobile_number: '',    // You might need to collect this manually
                    credit_score: 0,       // Default credit score
                    role: 'user'           // Default role for all new users
                }, { merge: true }) // Merge to avoid overwriting existing data
                .then(() => {
                    // Display success message and store logged-in user ID locally
                    alert('Google Sign-In Successful!');
                    sessionStorage.setItem('customerEmail', user.uid.email);

                    // Redirect based on email condition
                    if (userEmail === 'lkamala1971@gmail.com') {
                        window.location.href = 'admin.html'; // Specific email redirects to homepage
                    } else {
                        window.location.href = 'customer.html'; // Other users redirect elsewhere
                    }
                })
                .catch((error) => {
                    console.error("Error saving user to Firestore: ", error);
                });
            })
            .catch((error) => {
                console.error('Error during Google Sign-In: ', error);
                alert('Google Sign-In failed');
            });
    });
});


    // Sign Up Form Submission
    $('#signUpForm').submit(async function (e) {
        e.preventDefault();

        const name = $('#name').val();
        const email = $('#email').val();
        const password = $('#password').val();
        const confirmPassword = $('#confirmPassword').val();
        const mobile = $('#mobile').val();

        if (password !== confirmPassword) {
            alert("Passwords don't match!");
            return;
        }

        // Auto-increment customer_id from your Firestore counters table
        const newCustomerId = await getNewId(apiUrl, 'customer_counter');

        // Firebase Authentication: Create user with email and password
        auth.createUserWithEmailAndPassword(email, password)
            .then(function (userCredential) {
                var user = userCredential.user; // Get Firebase user object

                // Prepare user data for Firestore
                var userData = {
                    customer_id: newCustomerId,   // Auto-incremented customer ID
                    name: name,
                    email: email,
                    mobile_number: mobile,
                    credit_score: 0,
                    role: 'user'                 // Default role for all new users
                };

                // Save user data to Firestore customer collection
                db.collection('customer').doc(user.uid).set(userData)
                    .then(function () {
                        alert('Sign Up Successful! Please check your email.');
                        window.location.href = 'index.html'; // Redirect to the login page
                    })
                    .catch(function (error) {
                        console.error('Error saving user to Firestore:', error);
                    });
            })
            .catch(function (error) {
                alert('Error during sign-up: ' + error.message);
                console.log('Error:', error);
            });
    });

    // Function to auto-increment ID using the counters table
    async function getNewId(apiUrl, counterName) {
        let newId = 0;
        await $.ajax({
            url: `${apiUrl}Counters/${counterName}`,
            method: 'GET',
            async: false, // Changed to synchronous with async-await
            success: async function (data) {
                newId = parseInt(data.fields.customer_id.integerValue);
                // Increment the counter
                await $.ajax({
                    url: `${apiUrl}Counters/${counterName}`,
                    method: 'PATCH',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        fields: {
                            customer_id: { integerValue: ++newId }
                        }
                    })
                });
            }
        });
        return newId;
    }
    $('#forgotPasswordLink').click(function (e) {
        e.preventDefault();
        $('#forgotPasswordForm').toggle(); // Show or hide the form
    });

    // Forgot Password Form Submission
    $('#forgotForm').submit(function (e) {
        e.preventDefault();

        const email = $('#forgotEmail').val();
        auth.sendPasswordResetEmail(email)
            .then(function () {
                alert("Password reset email sent! Check your inbox.");
                window.location.reload();
            })
            .catch(function (error) {
                alert("Error: " + error.message);
            });
    });
});
