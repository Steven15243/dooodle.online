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
    const profilePicture = document.getElementById('profile-picture'); // Element for the profile picture

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
        // Load the body color
        const bodyColorImg = document.createElement('img');
        bodyColorImg.src = `colours/${character.bodyColor}`;
        bodyColorImg.style.position = 'absolute';
        bodyColorImg.style.zIndex = '1';

        // Load the eyes
        const eyesImg = document.createElement('img');
        if (character.eyes) {
            eyesImg.src = `eyes/${character.eyes}`;
            eyesImg.style.position = 'absolute';
            eyesImg.style.zIndex = '2';
        }

        // Load the mouth
        const mouthImg = document.createElement('img');
        if (character.mouth) {
            mouthImg.src = `mouth/${character.mouth}`;
            mouthImg.style.position = 'absolute';
            mouthImg.style.zIndex = '3';
        }

        // Clear the existing profile picture content
        profilePicture.innerHTML = '';
        profilePicture.style.position = 'relative';

        // Append the images to form the full character
        profilePicture.appendChild(bodyColorImg);
        if (character.eyes) {
            profilePicture.appendChild(eyesImg);
        }
        if (character.mouth) {
            profilePicture.appendChild(mouthImg);
        }
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
