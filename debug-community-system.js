// Debug script to test community system
// Run this in browser console on the create-video page

console.log('🔍 Community System Debug Script');

// Test 1: Check if create-video page loads
console.log('1. Testing create-video page...');
if (window.location.pathname === '/create-video') {
  console.log('✅ On create-video page');
} else {
  console.log('❌ Not on create-video page, navigate to /create-video first');
}

// Test 2: Check form elements
console.log('2. Checking form elements...');
const videoInput = document.querySelector('input[type="file"]');
const descriptionTextarea = document.querySelector('textarea[placeholder*="Describe"]');
const inviteDescriptionTextarea = document.querySelector('textarea[placeholder*="inviting"]');
const communityNameInput = document.querySelector('input[placeholder*="community"]');

console.log('Video input:', videoInput ? '✅ Found' : '❌ Missing');
console.log('Description textarea:', descriptionTextarea ? '✅ Found' : '❌ Missing');
console.log('Invite description textarea:', inviteDescriptionTextarea ? '✅ Found' : '❌ Missing');
console.log('Community name input:', communityNameInput ? '✅ Found' : '❌ Missing');

// Test 3: Check API endpoints
console.log('3. Testing API endpoints...');

// Test posts API
fetch('/api/posts', { method: 'GET' })
  .then(response => {
    console.log('Posts API status:', response.status);
    if (response.ok) {
      console.log('✅ Posts API working');
    } else {
      console.log('❌ Posts API error:', response.status);
    }
  })
  .catch(error => {
    console.log('❌ Posts API error:', error);
  });

// Test 4: Check for JavaScript errors
console.log('4. Monitoring for JavaScript errors...');
window.addEventListener('error', (event) => {
  console.log('❌ JavaScript Error:', event.error);
});

// Test 5: Form submission test (mock)
console.log('5. Form submission test ready');
console.log('To test form submission:');
console.log('- Fill out the form');
console.log('- Open Network tab in DevTools');
console.log('- Submit the form');
console.log('- Check for POST request to /api/posts');

console.log('🎯 Debug script loaded. Check console for results.');