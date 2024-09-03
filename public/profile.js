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
    const profileLikes = document.getElementById('profile-likes'); 
    const editBioInput = document.getElementById('edit-bio');
    const profilePicture = document.getElementById('profile-picture');
    const createCharacterButton = document.getElementById('create-character-button'); // Reference to the new button

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
                'X-Requested-With': 'XMLHttpRequest'
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
            profileLikes.textContent = `Total Likes: ${data.likes}`;
    
            if (data.characterUrl) {
                console.log("Character URL:", data.characterUrl);
                const profilePicture = document.getElementById('profile-picture');
                profilePicture.innerHTML = ''; 
                const img = document.createElement('img');
                img.src = data.characterUrl; 
                img.alt = 'Profile Picture';
                profilePicture.appendChild(img);
            } else {
                console.log("No character URL found.");
                const profilePicture = document.getElementById('profile-picture');
                profilePicture.innerHTML = '<img src="colours/default_character.png" alt="Default Profile Picture">'; // Use a fallback image
            }
        })
        .catch(error => {
            console.error('Error loading profile:', error);
            alert('Failed to load profile');
        });
    }
    
    

    function displayCharacter(character) {
        const bodyColorImg = document.createElement('img');
        bodyColorImg.src = `colours/${character.bodyColor}`;
        bodyColorImg.style.position = 'absolute';
        bodyColorImg.style.zIndex = '1';

        const eyesImg = document.createElement('img');
        if (character.eyes) {
            eyesImg.src = `eyes/${character.eyes}`;
            eyesImg.style.position = 'absolute';
            eyesImg.style.zIndex = '2';
        }

        const mouthImg = document.createElement('img');
        if (character.mouth) {
            mouthImg.src = `mouth/${character.mouth}`;
            mouthImg.style.position = 'absolute';
            mouthImg.style.zIndex = '3';
        }

        profilePicture.innerHTML = '';
        profilePicture.style.position = 'relative';
        profilePicture.appendChild(bodyColorImg);
        if (character.eyes) {
            profilePicture.appendChild(eyesImg);
        }
        if (character.mouth) {
            profilePicture.appendChild(mouthImg);
        }
    }

    // Navigate to the character creation page when the button is clicked
    createCharacterButton.addEventListener('click', () => {
        window.location.href = '/character.html';
    });

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
