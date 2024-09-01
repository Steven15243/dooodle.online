const url = `https://doodle-website.onrender.com/`; // Replace with your Render URL
const interval = 30000; // Interval in milliseconds (30 seconds)

function reloadWebsite() {
  axios.get(url)
    .then(response => {
      console.log(`Reloaded at ${new Date().toISOString()}: Status Code ${response.status}`);
    })
    .catch(error => {
      console.error(`Error reloading at ${new Date().toISOString()}:`, error.message);
    });
}


setInterval(reloadWebsite, interval);




let isDrawing = false;
let x = 0;
let y = 0;
const canvas = document.getElementById('doodleCanvas');
const context = canvas.getContext('2d');

canvas.addEventListener('mousedown', e => {
    x = e.offsetX;
    y = e.offsetY;
    isDrawing = true;
});

canvas.addEventListener('mousemove', e => {
    if (isDrawing === true) {
        drawLine(context, x, y, e.offsetX, e.offsetY);
        x = e.offsetX;
        y = e.offsetY;
    }
});

window.addEventListener('mouseup', e => {
    if (isDrawing === true) {
        drawLine(context, x, y, e.offsetX, e.offsetY);
        x = 0;
        y = 0;
        isDrawing = false;
    }
});

function drawLine(context, x1, y1, x2, y2) {
    context.beginPath();
    context.strokeStyle = 'black';
    context.lineWidth = 2;
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.closePath();
}

function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
}

async function getPrompt() {
    const response = await fetch('http://localhost:3000/prompt');
    const data = await response.json();
    document.getElementById('prompt').innerText = data.prompt;
}

async function submitDoodle() {
    const dataUrl = canvas.toDataURL('image/png');
    const response = await fetch('http://localhost:3000/doodle', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ doodleUrl: dataUrl })
    });

    if (response.ok) {
        alert('Doodle submitted successfully!');
        loadDoodles(); // Refresh the doodles gallery after submitting a new doodle
        clearCanvas();
    } else {
        alert('Failed to submit doodle.');
    }
}

// Updated loadDoodles function
async function loadDoodles() {
    const response = await fetch('http://localhost:3000/doodles');
    const doodles = await response.json();

    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';

    doodles.forEach(doodle => {
        const doodleItem = document.createElement('div');
        doodleItem.classList.add('doodle-item');

        const img = document.createElement('img');
        img.src = `http://localhost:3000/${doodle.doodleUrl}`;

        const usernameLabel = document.createElement('div');
        usernameLabel.classList.add('username');
        usernameLabel.innerText = `Created by: ${doodle.username || 'Unknown'}`;

        const likeButton = document.createElement('button');
        likeButton.innerText = `Like (${doodle.likes || 0})`;
        likeButton.addEventListener('click', async () => {
            try {
                const response = await fetch(`http://localhost:3000/doodle/${doodle._id}/like`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json();
                likeButton.innerText = `Like (${data.likes})`;
            } catch (error) {
                alert('Error liking doodle');
            }
        });

        doodleItem.appendChild(img);
        doodleItem.appendChild(usernameLabel);
        doodleItem.appendChild(likeButton);
        gallery.appendChild(doodleItem);
    });
}



// Load the prompt and doodles when the page loads
window.onload = () => {
    getPrompt();
    loadDoodles();
};