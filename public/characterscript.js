// Declare these variables globally to be accessible throughout the script
let bodyColor = 'default_character.png';
let eyes = '';
let mouth = '';

function updateCharacter() {
    bodyColor = document.querySelector('.color-options .selected')?.dataset.color || 'default_character.png';
    eyes = document.querySelector('.eye-options .selected')?.dataset.eye || '';
    mouth = document.querySelector('.mouth-options .selected')?.dataset.mouth || '';

    const bodyColorImg = document.getElementById('body-color');
    bodyColorImg.src = `colours/${bodyColor}`;

    const eyesLayer = document.getElementById('eyes-layer');
    if (eyes) {
        eyesLayer.src = `eyes/${eyes}`;
        eyesLayer.style.display = 'block';
    } else {
        eyesLayer.style.display = 'none';
    }

    const mouthLayer = document.getElementById('mouth-layer');
    if (mouth) {
        mouthLayer.src = `mouth/${mouth}`;
        mouthLayer.style.display = 'block';
    } else {
        mouthLayer.style.display = 'none';
    }
}

function createOptions(type, folder) {
    const container = document.querySelector(`.${type}-controls .${type}-options`);
    const files = [];

    switch(type) {
        case 'color':
            files.push('107AB0.png', '1E488F.png', '292319.png', '3C1F76.png', '5C8B15.png', '5D2C1D.png', '5E9B8A.png', '76CD26.png', '8C4646.png', '959396.png', '99C68E.png', 'B38B6D.png', 'B6B6B4.png', 'BC5952.png', 'CC3333.png', 'DA70D6.png', 'E9967A.png', 'EDB381.png', 'FFDF22.png');
            break;
        case 'eye':
            files.push('angryeyes.png', 'annoyedeyes.png', 'cooleyes.png', 'happyeyes.png', 'moneyeyes.png', 'normaleyes.png', 'sadeyes.png', 'XXeyes.png');
            break;
        case 'mouth':
            files.push('happy2mouth.png', 'happymouth.png', 'kawaiimouth.png', 'neutralmouth.png', 'sadmouth.png', 'surprised2mouth.png', 'surprisedmouth.png');
            break;
    }

    files.forEach(file => {
        const img = document.createElement('img');
        img.src = `${folder}/${file}`;
        img.dataset[type] = file;
        img.addEventListener('click', () => {
            document.querySelectorAll(`.${type}-options img`).forEach(img => img.classList.remove('selected'));
            img.classList.add('selected');
            updateCharacter();
        });
        container.appendChild(img);
    });
}

function init() {
    createOptions('color', 'colours');
    createOptions('eye', 'eyes');
    createOptions('mouth', 'mouth');

    updateCharacter();
}

document.addEventListener('DOMContentLoaded', init);

document.getElementById('save-character').addEventListener('click', () => {
    const characterData = { bodyColor, eyes, mouth };
    const token = localStorage.getItem('token');
    
    fetch('/save-character', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(characterData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Character saved successfully!');
            window.location.href = `/profile/${localStorage.getItem('username')}`;
        } else {
            alert('Failed to save character');
        }
    })
    .catch(error => console.error('Error:', error));
});

// Load and draw each image layer onto the canvas
const canvas = document.createElement('canvas');
canvas.width = 200; 
canvas.height = 200;
const ctx = canvas.getContext('2d');

const bodyColorImg = new Image();
bodyColorImg.src = `colours/${bodyColor}`;
bodyColorImg.onload = () => {
    ctx.drawImage(bodyColorImg, 0, 0, canvas.width, canvas.height);

    if (eyes) {
        const eyesImg = new Image();
        eyesImg.src = `eyes/${eyes}`;
        eyesImg.onload = () => {
            ctx.drawImage(eyesImg, 0, 0, canvas.width, canvas.height);

            if (mouth) {
                const mouthImg = new Image();
                mouthImg.src = `mouth/${mouth}`;
                mouthImg.onload = () => {
                    ctx.drawImage(mouthImg, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob((blob) => {
                        const formData = new FormData();
                        formData.append('file', blob, 'character.png');

                        const token = localStorage.getItem('token');

                        fetch('/upload-character', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            },
                            body: formData
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                alert('Character saved successfully!');
                                window.location.href = `/profile/${localStorage.getItem('username')}`;
                            } else {
                                alert('Failed to save character');
                            }
                        })
                        .catch(error => console.error('Error:', error));
                    }, 'image/png');
                };
            }
        };
    }
};
