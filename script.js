// Paystack API Keys (Test keys)
const PAYSTACK_PUBLIC_KEY = 'pk_test_7f1f42fd10b5c1f0a6e10c746bd5804eb43224ef';

// App State
let cart = [];
let userAuthorizationCode = null;
let currentOrderReference = null;
let currentTotalAmount = 0;
let currentPaymentMethod = null;
let preauthorizationReference = null;

// Initialize with empty cart
document.addEventListener('DOMContentLoaded', function() {
    updateCartDisplay();
    
    // Format card number input
    document.getElementById('card-number').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 16) value = value.slice(0, 16);
        value = value.replace(/(\d{4})/g, '$1 ').trim();
        e.target.value = value;
    });
    
    // Format expiry date input
    document.getElementById('card-expiry').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) value = value.slice(0, 4);
        if (value.length > 2) {
            value = value.slice(0, 2) + '/' + value.slice(2);
        }
        e.target.value = value;
    });
});

// Modal functions
function showModal() {
    document.getElementById('modal-total-amount').textContent = currentTotalAmount.toFixed(2);
    document.getElementById('paymentOptionsModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('paymentOptionsModal').style.display = 'none';
}

// Close modal if user clicks outside of it
window.onclick = function(event) {
    const modal = document.getElementById('paymentOptionsModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Product quantity functions
function increaseQuantity(productId) {
    const input = document.getElementById(`${productId}-quantity`);
    input.value = parseInt(input.value) + 1;
}

function decreaseQuantity(productId) {
    const input = document.getElementById(`${productId}-quantity`);
    if (parseInt(input.value) > 0) {
        input.value = parseInt(input.value) - 1;
    }
}

// --- Cart Functions ---
function addToCart(productId, name, price) {
    const quantity = parseInt(document.getElementById(`${productId}-quantity`).value);
    
    if (quantity <= 0) {
        showNotification('Please select at least 1 item', false);
        return;
    }
    
    // Check if product already in cart
    const existingItemIndex = cart.findIndex(item => item.id === productId);
    
    if (existingItemIndex >= 0) {
        // Update quantity if product already in cart
        cart[existingItemIndex].quantity += quantity;
    } else {
        // Add new product to cart
        cart.push({
            id: productId,
            name: name,
            price: price,
            quantity: quantity
        });
    }
    
    // Reset quantity input
    document.getElementById(`${productId}-quantity`).value = 0;
    
    updateCartDisplay();
    showNotification(`${quantity} ${name} added to cart!`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartDisplay();
}

function updateCartItemQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCartDisplay();
        }
    }
}

function updateCartDisplay() {
    const cartItemsElement = document.getElementById('cart-items');
    const cartSubtotalElement = document.getElementById('cart-subtotal');
    const taxAmountElement = document.getElementById('tax-amount');
    const grandTotalElement = document.getElementById('grand-total');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (cart.length === 0) {
        cartItemsElement.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Your cart is empty</p>
            </div>
        `;
        cartSubtotalElement.textContent = '0.00';
        taxAmountElement.textContent = '0.00';
        grandTotalElement.textContent = '0.00';
        checkoutBtn.disabled = true;
        return;
    }

    // Build cart items display
    cartItemsElement.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <strong>${item.name}</strong>
                <div>R ${item.price.toFixed(2)} each</div>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn" onclick="updateCartItemQuantity('${item.id}', -1)">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" onclick="updateCartItemQuantity('${item.id}', 1)">+</button>
                <span class="remove-item" onclick="removeFromCart('${item.id}')">
                    <i class="fas fa-trash"></i>
                </span>
            </div>
            <div class="cart-item-price">
                R ${(item.price * item.quantity).toFixed(2)}
            </div>
        </div>
    `).join('');

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 35;
    const tax = subtotal * 0.15;
    const grandTotal = subtotal + deliveryFee + tax;

    // Update display
    cartSubtotalElement.textContent = subtotal.toFixed(2);
    taxAmountElement.textContent = tax.toFixed(2);
    grandTotalElement.textContent = grandTotal.toFixed(2);
    
    // Enable checkout button
    checkoutBtn.disabled = false;
    
    // Store the total amount
    currentTotalAmount = grandTotal;
}

function showNotification(message, isSuccess = true) {
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 20px';
    notification.style.background = isSuccess ? '#00b14d' : '#e74c3c';
    notification.style.color = 'white';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '1000';
    notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 3000);
}

function checkout() {
    if (cart.length === 0) {
        showNotification("Your cart is empty!", false);
        return;
    }
    
    // Show payment options modal
    showModal();
}

function handlePaymentChoice(choice) {
    closeModal();
    currentPaymentMethod = choice;

    if (choice === 'paynow') {
        document.getElementById('order-status').innerHTML = '<p>Pay Now selected. Please enter your card details.</p>';
        document.getElementById('order-status').className = 'status-message info';
        showCardForm();
    } else if (choice === 'pod') {
        document.getElementById('order-status').innerHTML = '<p>Pay on Delivery selected. Please enter your card details to reserve funds.</p>';
        document.getElementById('order-status').className = 'status-message info';
        showCardForm();
    } else if (choice === 'cancel') {
        document.getElementById('order-status').innerHTML = '<p>Payment cancelled.</p>';
        document.getElementById('order-status').className = 'status-message error';
        showNotification("Order cancelled.");
    }
}

function showCardForm() {
    document.getElementById('card-form').style.display = 'block';
    // Scroll to card form
    document.getElementById('card-form').scrollIntoView({ behavior: 'smooth' });
}

function hideCardForm() {
    document.getElementById('card-form').style.display = 'none';
    document.getElementById('order-status').innerHTML = '<p>Payment cancelled</p>';
    document.getElementById('order-status').className = 'status-message error';
}

function processPayment() {
    const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
    const cardholderName = document.getElementById('cardholder-name').value;
    const cardExpiry = document.getElementById('card-expiry').value;
    const cardCvv = document.getElementById('card-cvv').value;
    const cardEmail = document.getElementById('card-email').value;

    // Validate inputs
    if (!cardNumber || !cardholderName || !cardExpiry || !cardCvv || !cardEmail) {
        showNotification('Please fill in all card details', false);
        return;
    }

    if (cardNumber.length < 16) {
        showNotification('Please enter a valid card number', false);
        return;
    }

    // Show processing UI
    document.getElementById('card-form').style.display = 'none';
    document.getElementById('verification-process').style.display = 'block';
    document.getElementById('processingOverlay').style.display = 'flex';
    
    if (currentPaymentMethod === 'pod') {
        document.getElementById('pod-step').style.display = 'flex';
        document.getElementById('processingText').textContent = 'Processing Pay on Delivery request...';
    } else {
        document.getElementById('processingText').textContent = 'Processing your payment...';
    }

    // Simulate verification steps with delays
    simulateVerificationProcess();
}

function simulateVerificationProcess() {
    // Step 1: Validating card details
    setTimeout(() => {
        document.getElementById('verification-icon-1').textContent = '✅';
        document.getElementById('verification-icon-1').className = 'verification-icon step-completed';
        
        // Step 2: Connecting to payment gateway
        setTimeout(() => {
            document.getElementById('verification-icon-2').textContent = '✅';
            document.getElementById('verification-icon-2').className = 'verification-icon step-completed';
            
            // Step 3: Processing transaction
            setTimeout(() => {
                document.getElementById('verification-icon-3').textContent = '✅';
                document.getElementById('verification-icon-3').className = 'verification-icon step-completed';
                
                // For POD, show additional step
                if (currentPaymentMethod === 'pod') {
                    setTimeout(() => {
                        completePaymentProcess();
                    }, 1500);
                } else {
                    completePaymentProcess();
                }
            }, 1500);
        }, 1500);
    }, 1500);
}

function completePaymentProcess() {
    const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
    
    // Determine outcome based on card number
    if (cardNumber.includes('4084084084084081')) {
        // Successful transaction
        setTimeout(() => {
            // For POD, update the reserve funds status
            if (currentPaymentMethod === 'pod') {
                document.getElementById('verification-icon-4').textContent = '✅';
                document.getElementById('verification-icon-4').className = 'verification-icon step-completed';
            }
            
            document.getElementById('verification-icon-5').textContent = '✅';
            document.getElementById('verification-icon-5').className = 'verification-icon step-completed';
            
            document.getElementById('processingOverlay').style.display = 'none';
            
            if (currentPaymentMethod === 'pod') {
                document.getElementById('order-status').innerHTML = '<p>Pay on Delivery setup successful! Funds have been reserved.</p>';
                document.getElementById('order-status').className = 'status-message success';
                document.getElementById('delivery-section').style.display = 'block';
                showNotification('POD order created successfully! Funds reserved.');
            } else {
                document.getElementById('order-status').innerHTML = '<p>Payment successful! Your order is being processed.</p>';
                document.getElementById('order-status').className = 'status-message success';
                showNotification('Payment processed successfully!');
                
                // Clear cart after successful payment
                cart = [];
                updateCartDisplay();
            }
        }, 1500);
    } else {
        // Failed transaction
        setTimeout(() => {
            // For POD, update the reserve funds status to failed
            if (currentPaymentMethod === 'pod') {
                document.getElementById('verification-icon-4').textContent = '❌';
                document.getElementById('verification-icon-4').className = 'verification-icon step-failed';
            }
            
            document.getElementById('verification-icon-5').textContent = '❌';
            document.getElementById('verification-icon-5').className = 'verification-icon step-failed';
            
            document.getElementById('processingOverlay').style.display = 'none';
            
            let errorMessage = 'Payment failed. Please try again.';
            
            if (cardNumber.includes('4084080000000008')) {
                errorMessage = 'Payment failed: Insufficient funds. Cannot reserve funds for Pay on Delivery.';
            } else if (cardNumber.includes('4123450000000009')) {
                errorMessage = 'Payment failed: Do not honor.';
            } else if (cardNumber.includes('4123450000000017')) {
                errorMessage = 'Payment failed: Invalid transaction.';
            }
            
            document.getElementById('order-status').innerHTML = `<p>${errorMessage}</p>`;
            document.getElementById('order-status').className = 'status-message error';
            showNotification('Payment failed!', false);
        }, 1500);
    }
}

function simulateDelivery() {
    document.getElementById('processingOverlay').style.display = 'flex';
    document.getElementById('processingText').textContent = 'Capturing payment and completing delivery...';
    
    // Simulate API call to capture payment
    setTimeout(() => {
        document.getElementById('processingOverlay').style.display = 'none';
        document.getElementById('order-status').innerHTML = '<p>Delivery completed! Payment captured successfully.</p>';
        document.getElementById('order-status').className = 'status-message success';
        document.getElementById('delivery-section').style.display = 'none';
        showNotification('Delivery completed and payment processed!');
        
        // Clear cart after successful delivery
        cart = [];
        updateCartDisplay();
    }, 2000);
}

function fillCard(number, expiry, cvv) {
    document.getElementById('card-number').value = number;
    document.getElementById('card-expiry').value = expiry;
    document.getElementById('card-cvv').value = cvv;
    document.getElementById('cardholder-name').value = 'Test Customer';
    document.getElementById('card-email').value = 'customer@example.com';
    showNotification(`Card ${number} filled for testing`);
}