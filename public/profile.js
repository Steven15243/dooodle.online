// profile.js
document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username'); 
    const token = localStorage.getItem('token');

    if (!username || !token) {
        alert('You must be logged in to view this page');
        window.location.href = '/';
        return;
    }

    const profileUsername = document.getElementById('profile-username');
    const profileBio = document.getElementById('profile-bio');
    const profileLikes = document.getElementById('profile-likes'); // Element to display total likes
    const editBioInput = document.getElementById('edit-bio');

    // Verify token with the server
    fetch('/verify-token', {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(response => {
        if (response.ok) {
            loadUserProfile();
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            alert('Session expired. Please log in again.');
            window.location.href = '/';
        }
    }).catch(() => {
        alert('Error verifying session. Please log in again.');
        window.location.href = '/';
    });

    function loadUserProfile() {
        fetch(`/profile/${username}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Requested-With': 'XMLHttpRequest' // Ensure this is recognized as an AJAX request
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load profile');
            }
            return response.json();
        })
        .then(data => {
            profileUsername.textContent = data.username;
            profileBio.textContent = data.bio;
            profileLikes.textContent = `Total Likes: ${data.likes}`; // Display total likes
    
            // Display character if it exists
            if (data.character) {
                displayCharacter(data.character);
            }
        })
        .catch(error => {
            console.error('Error loading profile:', error);
            alert('Failed to load profile');
        });
    }
    
    function displayCharacter(character) {
        const characterPreview = document.getElementById('character-preview');
        characterPreview.innerHTML = `
            <img src="colours/${character.bodyColor}" alt="Body Color">
            <img src="eyes/${character.eyes}" alt="Eyes">
            <img src="mouth/${character.mouth}" alt="Mouth">
        `;
    }
    

    document.getElementById('save-profile').addEventListener('click', () => {
        const bio = editBioInput.value;

        fetch(`/profile/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ bio })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update profile');
            }
            return response.json();
        })
        .then(data => {
            alert('Profile updated successfully');
            profileBio.textContent = data.user.bio;
        })
        .catch(error => {
            console.error('Error updating profile:', error);
            alert('Failed to update profile');
        });
    });
});
