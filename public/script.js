//script.js
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    let drawing = false;
    let actions = [];  // Array to hold all drawing actions
    let undoneActions = []; // Array to hold undone actions for redo

    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    const brushSizeInput = document.getElementById('brush-size');
    const brushColorInput = document.getElementById('brush-color');
    const eraserButton = document.getElementById('eraser-button');
    const eraserIcon = document.getElementById('eraser-icon');

    // Set default brush size and color
    let brushSize = parseInt(brushSizeInput.value, 10);
    let brushColor = brushColorInput.value;
    let isEraserActive = false; // Track eraser state

    // Initialize context with default brush settings
    context.lineWidth = brushSize;
    context.strokeStyle = brushColor;

    // Update brush size and color
    brushSizeInput.addEventListener('input', () => {
        brushSize = parseInt(brushSizeInput.value, 10);
        context.lineWidth = brushSize;
    });

    brushColorInput.addEventListener('input', () => {
        if (!isEraserActive) {
            brushColor = brushColorInput.value;
            context.strokeStyle = brushColor;
        }
    });

    eraserButton.addEventListener('click', () => {
        isEraserActive = !isEraserActive;

        if (isEraserActive) {
            context.strokeStyle = '#FFFFFF'; // Set to white (assuming white is the canvas background)
            eraserIcon.src = 'uploads/eraser-on-icon.png';
            canvas.style.cursor = 'url("uploads/eraser-on-icon.png"), auto'; // Custom cursor
        } else {
            context.strokeStyle = brushColor;
            eraserIcon.src = 'uploads/eraser-off-icon.png';
            canvas.style.cursor = 'crosshair'; // Default drawing cursor
        }
    });

    function updateCoordinates(event) {
        const rect = canvas.getBoundingClientRect();
        let x, y;

        if (event.touches) {  // For touch events
            x = event.touches[0].clientX - rect.left;
            y = event.touches[0].clientY - rect.top;
        } else {  // For mouse events
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
        }

        // Adjust for canvas scaling (if any)
        x = Math.round((x / rect.width) * canvas.width);
        y = Math.round((y / rect.height) * canvas.height);

        return { x, y };
    }

    function startDrawing(event) {
        drawing = true;
        context.beginPath();
        const { x, y } = updateCoordinates(event);
        context.moveTo(x, y);

        // Start tracking this drawing action
        const action = { type: 'path', points: [{ x, y }], color: context.strokeStyle, size: context.lineWidth };
        actions.push(action);

        // Clear the redo stack when a new action is made
        undoneActions = [];

        event.preventDefault();  // Prevent scrolling or other default actions
    }

    function stopDrawing() {
        drawing = false;
        context.beginPath(); // Begin a new path to avoid lines connecting between touch/mouse events
    }

    function draw(event) {
        if (!drawing) return;
        const { x, y } = updateCoordinates(event);
        context.lineTo(x, y);
        context.stroke();

        // Add point to the current action
        actions[actions.length - 1].points.push({ x, y });

        event.preventDefault();  // Prevent scrolling or other default actions
    }

    // Undo function to remove the last action
    function undoLastMove() {
        if (actions.length > 0) {
            const lastAction = actions.pop();  // Remove the last action
            undoneActions.push(lastAction); // Store it for redo
            redrawCanvas(); // Redraw the entire canvas based on remaining actions
        }
    }

    // Redo function to restore the last undone action
    function redoLastMove() {
        if (undoneActions.length > 0) {
            const action = undoneActions.pop(); // Remove the last undone action
            actions.push(action); // Re-add it to the actions stack
            redrawCanvas(); // Redraw the entire canvas with the redone action
        }
    }

    // Function to redraw the canvas
    function redrawCanvas() {
        context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        actions.forEach(action => {
            context.beginPath();
            context.strokeStyle = action.color;
            context.lineWidth = action.size;
            action.points.forEach((point, index) => {
                if (index === 0) {
                    context.moveTo(point.x, point.y);
                } else {
                    context.lineTo(point.x, point.y);
                }
            });
            context.stroke();
        });
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Adding touch events
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

    document.getElementById('save').addEventListener('click', () => {
        canvas.toBlob((blob) => {
            const formData = new FormData();
            formData.append('doodle', blob, 'doodle.png');

            fetch('/doodle', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                console.log('Doodle saved:', data);
                loadDoodles();
            });
        }, 'image/png');
    });

    document.getElementById('undo').addEventListener('click', undoLastMove); // Attach undo function to the button
    document.getElementById('redo').addEventListener('click', redoLastMove); // Attach redo function to the button

    document.getElementById('show-register').addEventListener('click', () => {
        document.getElementById('register-form').style.display = 'block';
        document.getElementById('login-form').style.display = 'none';
    });

    document.getElementById('show-login').addEventListener('click', () => {
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    });

    document.getElementById('register').addEventListener('click', () => {
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;

        fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(response => {
            if (response.status === 201) {
                alert('Registration successful, please login');
                document.getElementById('register-form').style.display = 'none';
            } else {
                return response.text().then(text => { throw new Error(text) });
            }
        }).catch(error => {
            alert(`Registration failed: ${error.message}`);
        });
    });

    document.getElementById('login').addEventListener('click', () => {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(response => response.json()).then(data => {
            console.log(data);
            if (data.message === 'Login successful') {
                if (data.profilePictureUrl) {
                    document.getElementById('profile-picture').src = data.profilePictureUrl;
                  } else {
                    document.getElementById('profile-picture').src = '/assets/default-profile.png';
                  }
                alert('Login successful');
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', username);
                document.getElementById('login-form').style.display = 'none';
                document.getElementById('auth-buttons').style.display = 'none';
                document.getElementById('username-display').innerText = `Logged in as: ${username}`;
                document.getElementById('login-message').style.display = 'none';
                document.getElementById('profile-link').style.display = 'inline'; // Show profile link on successful login
                loadPrompt();
                loadDoodles();
            } else {
                alert('Login failed');
            }
        });
    });

    function loadDoodles() {
        fetch('/doodles', {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(response => response.json()).then(doodles => {
            const doodlesDiv = document.getElementById('doodles');
            doodlesDiv.innerHTML = '';
            doodles.forEach(doodle => {
                const doodleItem = document.createElement('div');
                doodleItem.classList.add('doodle-item');

                // Adding username with a link to the profile
                const usernameLabel = document.createElement('div');
                usernameLabel.classList.add('username');
                usernameLabel.innerHTML = `Created by: <a href="/profile/${doodle.username}">${doodle.username}</a>`;
                doodleItem.appendChild(usernameLabel);

                // Adding doodle image
                const img = document.createElement('img');
                img.src = doodle.doodleUrl;
                doodleItem.appendChild(img);

                // Adding like button
                const likeButton = document.createElement('button');
                likeButton.className = 'like-button';
                likeButton.innerText = `Like (${doodle.likes || 0})`;

                likeButton.addEventListener('click', async () => {
                    try {
                        const response = await fetch(`/doodle/${doodle._id}/like`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        if (response.ok) {
                            const data = await response.json();
                            likeButton.innerText = `Like (${data.likes})`;
                        } else {
                            alert('Error liking doodle');
                        }
                    } catch (error) {
                        alert('Error liking doodle');
                    }
                });

                doodleItem.appendChild(likeButton);
                
                // Add Comments button
                const commentButton = document.createElement('button');
                commentButton.innerText = 'Comments';
                commentButton.classList.add('comment-button'); // Add a class for styling
                commentButton.addEventListener('click', () => {
                    loadComments(doodle._id);
                });

                doodleItem.appendChild(commentButton);

                // Add section to display comments
                const commentSection = document.createElement('div');
                commentSection.classList.add('comments-section');
                commentSection.id = `comments-${doodle._id}`;
                doodleItem.appendChild(commentSection);

                doodlesDiv.appendChild(doodleItem);
            });
        });
    }

    function loadPrompt() {
        fetch('/prompt', {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(response => response.json()).then(data => {
            document.getElementById('prompt').innerText = data.prompt;
        });
    }

    // Verify token on page load
    if (token && username) {
        // Verify token with the server
        fetch('/verify-token', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                // Token is valid
                document.getElementById('auth-buttons').style.display = 'none';
                document.getElementById('username-display').innerText = `Logged in as: ${username}`;
                document.getElementById('login-message').style.display = 'none';
                document.getElementById('profile-link').style.display = 'inline'; // Show profile link on valid token
                loadPrompt();
                loadDoodles();
            } else {
                // Token is invalid
                throw new Error('Invalid token');
            }
        })
        .catch(() => {
            // Token is invalid or an error occurred, clear storage and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            document.getElementById('auth-buttons').style.display = 'flex';
            document.getElementById('username-display').innerText = '';
            document.getElementById('profile-link').style.display = 'none'; // Hide profile link on invalid token
            alert('Session expired. Please log in again.');
        });
    } else {
        document.getElementById('auth-buttons').style.display = 'flex';
        document.getElementById('username-display').innerText = '';
        document.getElementById('profile-link').style.display = 'none'; // Hide profile link if no token
    }

    function loadComments(doodleId) {
        const commentSection = document.getElementById(`comments-${doodleId}`);
        fetch(`/doodle/${doodleId}/comments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(response => response.json()).then(comments => {
            commentSection.innerHTML = ''; // Clear previous comments
            comments.forEach(comment => {
                const commentItem = document.createElement('div');
                commentItem.classList.add('comment-item');
                commentItem.innerText = `${comment.username}: ${comment.text}`;
                commentSection.appendChild(commentItem);
            });

            // Add a form to submit a new comment
            const commentForm = document.createElement('form');
            commentForm.classList.add('comment-form');
            const commentInput = document.createElement('input');
            commentInput.type = 'text';
            commentInput.placeholder = 'Write a comment...';
            const commentSubmit = document.createElement('button');
            commentSubmit.innerText = 'Post';
            commentForm.appendChild(commentInput);
            commentForm.appendChild(commentSubmit);
            commentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                postComment(doodleId, commentInput.value);
                commentInput.value = ''; // Clear the input field after submission
            });

            commentSection.appendChild(commentForm);
        });
    }

    function postComment(doodleId, text) {
        fetch(`/doodle/${doodleId}/comment`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text })
        }).then(response => response.json()).then(comment => {
            loadComments(doodleId); // Reload comments after posting
        });
    }

    // Dark Mode Toggle Script
    const toggleButton = document.getElementById('dark-mode-toggle');

    toggleButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        toggleButton.classList.toggle('dark');

        // Change icon based on mode
        if (document.body.classList.contains('dark-mode')) {
            toggleButton.textContent = '🌞'; // Sun icon for dark mode
        } else {
            toggleButton.textContent = '🌑'; // Moon icon for light mode
        }

        // Save preference to localStorage
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
    });

    // Initialize based on saved preference
    window.addEventListener('load', () => {
        const darkModePreference = localStorage.getItem('darkMode') === 'true';
        if (darkModePreference) {
            document.body.classList.add('dark-mode');
            toggleButton.classList.add('dark');
            toggleButton.textContent = '🌞'; // Set sun icon if dark mode
        } else {
            toggleButton.textContent = '🌑'; // Set moon icon if light mode
        }
    });
    document.querySelector('.x-logo').addEventListener('click', function() {
        alert("You're being redirected to our X account!");
    });
    const createCharacterButton = document.getElementById('create-character-button');
  const characterModal = document.getElementById('character-modal');
  const closeButton = document.querySelector('.close-button');
  const characterCanvas = document.getElementById('character-canvas');
  const characterCtx = characterCanvas.getContext('2d');
  const colorSelect = document.getElementById('color-select');
  const eyesSelect = document.getElementById('eyes-select');
  const mouthSelect = document.getElementById('mouth-select');
  const saveCharacterButton = document.getElementById('save-character-button');

  // Open Modal
  createCharacterButton.addEventListener('click', () => {
    if (token && username) {
      characterModal.style.display = 'block';
      renderCharacter();
    } else {
      alert('Please log in to create a character.');
    }
  });

  // Close Modal
  closeButton.addEventListener('click', () => {
    characterModal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
    if (event.target == characterModal) {
      characterModal.style.display = 'none';
    }
  });

  // Render Character based on selections
  function renderCharacter() {
    // Clear canvas
    characterCtx.clearRect(0, 0, characterCanvas.width, characterCanvas.height);

    // Draw base color
    characterCtx.fillStyle = colorSelect.value;
    characterCtx.fillRect(0, 0, characterCanvas.width, characterCanvas.height);

    // Load and draw eyes
    const eyesImage = new Image();
    eyesImage.src = `/assets/eyes/${eyesSelect.value}`; // Ensure these paths are correct
    eyesImage.onload = () => {
      characterCtx.drawImage(eyesImage, 50, 50, 100, 50); // Adjust positioning as needed

      // Load and draw mouth after eyes have loaded
      const mouthImage = new Image();
      mouthImage.src = `/assets/mouths/${mouthSelect.value}`;
      mouthImage.onload = () => {
        characterCtx.drawImage(mouthImage, 50, 120, 100, 50); // Adjust positioning as needed
      };
    };
  }

  // Update character when selections change
  colorSelect.addEventListener('change', renderCharacter);
  eyesSelect.addEventListener('change', renderCharacter);
  mouthSelect.addEventListener('change', renderCharacter);

  // Save and upload character as profile picture
  saveCharacterButton.addEventListener('click', () => {
    characterCanvas.toBlob((blob) => {
      const formData = new FormData();
      formData.append('profilePicture', blob, 'profile-picture.png');

      fetch('/upload-profile-picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if(data.success) {
          alert('Profile picture updated successfully!');
          characterModal.style.display = 'none';
          // Update profile picture display if applicable
          document.getElementById('profile-picture').src = data.profilePictureUrl;
        } else {
          alert('Failed to update profile picture.');
        }
      })
      .catch(error => {
        console.error('Error uploading profile picture:', error);
        alert('An error occurred while uploading your profile picture.');
      });
    }, 'image/png');
  });
    
});