import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
// No background - transparent so video shows through

// Camera setup
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 6;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0); // Transparent background
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Lighting - much brighter for vivid images
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight2.position.set(-5, -5, -5);
scene.add(directionalLight2);

// Texture loader
const textureLoader = new THREE.TextureLoader();

// Create wheel group
const wheelGroup = new THREE.Group();
scene.add(wheelGroup);

// Create four vinyl-like planes with textures - thicker with beveled edges
const planeSize = 3 * 0.7;
const imageFiles = ['Laura1.jpg', 'Agnes1.jpg', 'Kayak1.jpg', 'Rosa1.jpg'];
const artistNames = ['Laura Kjeldgaard Christensen', 'Agnes Hartwich', 'Eva Berghamar', 'Rosa Sandager'];
const artistAliases = ['LAURA4EVIGT', '', '', ''];
const artistColors = [0x5C782D, 0xBA3801, 0xFFEC89, 0x4A69B3]; // olive, rust, yellow, navy
const planes = [];

for (let i = 0; i < 4; i++) {
    const texture = textureLoader.load(
        `./assets/${imageFiles[i]}`,
        () => {
            console.log(`Loaded ${imageFiles[i]}`);
        },
        undefined,
        () => {
            console.warn(`Could not load ${imageFiles[i]}`);
        }
    );
    
    // Create box geometry for clean thickness without distortion
    const vinylGeometry = new THREE.BoxGeometry(planeSize, planeSize, 0.02);
    
    // Create materials array - texture on front/back, dark on sides
    const materials = [
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.1 }), // right
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.1 }), // left
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.1 }), // top
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.1 }), // bottom
        new THREE.MeshStandardMaterial({ map: texture, roughness: 0.1, metalness: 0.0 }), // front
        new THREE.MeshStandardMaterial({ map: texture, roughness: 0.1, metalness: 0.0 })  // back
    ];
    
    const plane = new THREE.Mesh(vinylGeometry, materials);
    
    // Position planes in a circle (90 degrees apart)
    const angle = (i * Math.PI) / 2;
    const radius = 3;
    
    plane.position.x = Math.sin(angle) * radius;
    plane.position.z = Math.cos(angle) * radius;
    plane.rotation.y = -angle;
    plane.userData.index = i;
    plane.userData.artistName = artistNames[i];
    plane.userData.backgroundColor = artistColors[i];
    
    wheelGroup.add(plane);
    planes.push(plane);
}

// Create selection indicator (border outline around selected plane)
const outlineGeometry = new THREE.PlaneGeometry(planeSize + 0.15, planeSize + 0.15);
const outlineMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFF8C00,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0
});
const selectionOutline = new THREE.Mesh(outlineGeometry, outlineMaterial);
selectionOutline.visible = false;
wheelGroup.add(selectionOutline);

// Create triangle indicator above selected plane (pointing down)
const triangleShape = new THREE.Shape();
triangleShape.moveTo(0, -0.3);
triangleShape.lineTo(-0.25, 0.15);
triangleShape.lineTo(0.25, 0.15);
triangleShape.lineTo(0, -0.3);

const triangleGeometry = new THREE.ShapeGeometry(triangleShape);
const triangleMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xDDDDE2,
    side: THREE.DoubleSide
});
const triangleIndicator = new THREE.Mesh(triangleGeometry, triangleMaterial);
triangleIndicator.visible = false;
wheelGroup.add(triangleIndicator);

// Raycaster for click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Info overlay element
const infoOverlay = document.createElement('div');
infoOverlay.id = 'info-overlay';
infoOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 50;
    transition: opacity 0.5s ease;
    pointer-events: none;
`;
document.body.appendChild(infoOverlay);

const infoText = document.createElement('div');
infoText.style.cssText = `
    font-family: 'Italian Plate No2 Expanded', 'Anonymous Pro', monospace;
    font-size: 4rem;
    font-weight: bold;
    color: #FFFFFF;
    text-align: center;
`;
infoOverlay.appendChild(infoText);

// Artist data - Dazed style content
const artistData = {
    'Laura Kjeldgaard Christensen': {
        overtitle: 'LAURA',
        subtitle: 'KJELDGAARD CHRISTENSEN',
        quote: '',
        description: '',
        label: '',
        video: 'Laura4evigt.mp4',
        textColor: '#F13D05',
        accentColor: '#1B2A35',
        iconColor: '#F13D05'
    },
    'Agnes Hartwich': {
        overtitle: 'AGNES',
        subtitle: 'HARTWICH',
        quote: '',
        description: '',
        label: '',
        video: 'Agnes.MP4',
        iconColor: '#FF8C00'
    },
    'Eva Berghamar': {
        overtitle: 'EVA',
        subtitle: 'BERGHAMAR',
        quote: '',
        description: '',
        label: '',
        video: 'Kayak2.mp4',
        textColor: '#C9B74A',
        accentColor: '#C9B74A',
        iconColor: '#C9B74A'
    },
    'Rosa Sandager': {
        overtitle: 'ROSA',
        subtitle: 'SANDAGER',
        quote: '',
        description: '',
        label: '',
        video: 'Rosa.mp4',
        textColor: '#DDDDE2',
        accentColor: '#8B4789',
        iconColor: '#DDDDE2'
    }
};

// Create Dazed-style overlay
const artistOverlay = document.createElement('div');
artistOverlay.id = 'artist-overlay';
artistOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: none;
    z-index: 5;
    opacity: 0;
    transition: opacity 0.6s ease;
    pointer-events: none;
`;
document.body.appendChild(artistOverlay);

// Video background element
const videoBackground = document.createElement('video');
videoBackground.id = 'artist-video-bg';
videoBackground.autoplay = true;
videoBackground.muted = true;
videoBackground.loop = true;
videoBackground.playsInline = true;
videoBackground.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 10;
    display: none;
    opacity: 1;
`;
document.body.appendChild(videoBackground);

const overlayContent = document.createElement('div');
overlayContent.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 8rem 4rem;
    z-index: 100;
    opacity: 1;
    transition: none;
    pointer-events: none;
`;
document.body.appendChild(overlayContent);

// Large artist name - Top left
const largeName = document.createElement('h1');
largeName.style.cssText = `
    position: absolute;
    top: 15%;
    left: 5%;
    font-family: 'Nunito Sans', 'Arial Black', sans-serif;
    font-size: 9.5rem;
    font-weight: 900;
    color: #FF8C00;
     letter-spacing: -0.02em;
    line-height: 0.76;
    margin: 0;
    pointer-events: none;
    text-transform: uppercase;
    z-index: 10;
    -webkit-text-stroke: 2px #0B0B0F;
    paint-order: stroke fill;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
`;
overlayContent.appendChild(largeName);

// Subtitle - Below largeName
const subtitle = document.createElement('div');
subtitle.style.cssText = `
    position: absolute;
    top: calc(15% + 9.5rem);
    left: 18%;
    font-family: 'Nunito Sans', 'Arial Black', sans-serif;
    font-size: 9.5rem;
    font-weight: 900;
    color: #FF8C00;
    text-transform: uppercase;
    letter-spacing: -0.02em;
    line-height: 0.46;
    z-index: 10;
    -webkit-text-stroke: 2px #0B0B0F;
    paint-order: stroke fill;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
`;
overlayContent.appendChild(subtitle);

// Overtitle - hidden for Agnes style
const overtitle = document.createElement('div');
overtitle.style.cssText = `
    display: none;
`;
overlayContent.appendChild(overtitle);

// Label - top left
const label = document.createElement('div');
label.style.cssText = `
    position: absolute;
    top: 25%;
    left: 5%;
    font-family: 'Anonymous Pro', monospace;
    font-size: 1rem;
    font-weight: 400;
    color: #e70000ff;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    padding: 0.5rem 1rem;
    /* Remove default border to avoid empty rectangle */
    border: none;
    display: none;
`;
overlayContent.appendChild(label);

// Quote - bottom center
const quote = document.createElement('div');
quote.style.cssText = `
    position: absolute;
    bottom: 8%;
    left: 50%;
    transform: translateX(-50%);
    font-family: 'Outfit', sans-serif;
    font-size: 1.3rem;
    font-weight: 400;
    color: #FF8C00;
    font-style: normal;
    max-width: 600px;
    line-height: 1.4;
    text-align: center;
    z-index: 10;
`;
overlayContent.appendChild(quote);

// Accent line - hidden
const accentLine = document.createElement('div');
accentLine.style.cssText = `display: none;`;
overlayContent.appendChild(accentLine);

// Social icons container - hidden until artist is clicked
const socialIcons = document.createElement('div');
socialIcons.style.cssText = `
    position: absolute;
    bottom: 5%;
    right: 3%;
    display: flex;
    gap: 1.5rem;
    z-index: 10;
    mix-blend-mode: difference;
    pointer-events: auto;
`;
overlayContent.appendChild(socialIcons);

// Remove image-based social icons; use text links only

// Side banner image - right edge
const sideBanner = document.createElement('img');
sideBanner.id = 'side-banner';
sideBanner.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    width: auto;
    object-fit: cover;
    z-index: 80;
    display: none;
    pointer-events: none;
`;
document.body.appendChild(sideBanner);

// Track if overlay is currently shown
let currentArtist = null;

// Click event listener
window.addEventListener('click', (event) => {
    // Check for wheel clicks
    
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // Check for intersections
    const intersects = raycaster.intersectObjects(planes);
    
    if (intersects.length > 0) {
        const clickedPlane = intersects[0].object;
        const bgColor = clickedPlane.userData.backgroundColor;
        const artistName = clickedPlane.userData.artistName;
        const data = artistData[artistName];
        
        // If clicking same artist, do nothing
        if (currentArtist === artistName && artistOverlay.style.opacity === '1') return;
        
        // Function to update overlay content
        const updateOverlayContent = () => {
            // Keep overlay background transparent so wheel stays visible
            artistOverlay.style.background = 'transparent';
            
            // Get artist colors or use default orange
            const textColor = data.textColor || '#FF8C00';
            const accentColor = data.accentColor || '#FF8C00';
            // Override: all artist text uses light color
            const lightColor = '#DDDDE2';
            
            // Update content based on artist
            if (data.subtitle) {
                // Split name style (Agnes/Laura)
                largeName.textContent = data.overtitle;
                largeName.style.color = lightColor;
                // For Laura: break into three lines LAURA / KJELDGAARD / CHRISTENSEN
                if (artistName === 'Laura Kjeldgaard Christensen') {
                    // Remove middle name, show only last name
                    subtitle.textContent = 'CHRISTENSEN';
                } else {
                    subtitle.textContent = data.subtitle;
                }
                subtitle.style.color = lightColor;
                subtitle.style.display = 'block';
            } else {
                // Other artists - full name
                largeName.textContent = data.overtitle;
                largeName.style.color = lightColor;
                subtitle.style.display = 'none';
            }
            
            overtitle.textContent = '';
            // Hide label to remove white rectangle
            label.style.display = 'none';
            quote.textContent = data.quote;
            quote.style.color = lightColor;
            
            // Update social icon colors to use artist-specific icon color
            const iconColor = data.iconColor || textColor;
            // Apply precise filters per known brand colours for better match
            const applyFilterForColor = (hex) => {
                switch (hex.toUpperCase()) {
                    case '#F13D05': // Laura red
                        return 'invert(26%) sepia(85%) saturate(4800%) hue-rotate(2deg) brightness(95%) contrast(105%)';
                    case '#FF8C00': // Agnes orange
                        return 'invert(54%) sepia(83%) saturate(653%) hue-rotate(1deg) brightness(100%) contrast(102%)';
                    case '#DDDDE2': // Rosa light gray
                        return 'invert(93%) sepia(2%) saturate(232%) hue-rotate(189deg) brightness(95%) contrast(89%)';
                    default:
                        return 'brightness(0) saturate(100%)';
                }
            };
            const filter = applyFilterForColor(iconColor);
            // Replace icons with underlined text links styled to match artist color
            socialIcons.innerHTML = '';
            const makeLink = (label, href) => {
                const a = document.createElement('a');
                a.textContent = label;
                a.href = href || '#';
                a.target = '_blank';
                a.style.textDecoration = 'underline';
                a.style.fontFamily = "Outfit, sans-serif";
                a.style.fontSize = '2rem';
                a.style.lineHeight = '2.2rem';
                a.style.color = '#FFFFFF';
                a.style.mixBlendMode = 'difference';
                a.style.cursor = 'pointer';
                return a;
            };
            socialIcons.appendChild(makeLink('Spotify', data.spotifyUrl));
            socialIcons.appendChild(makeLink('Instagram', data.instagramUrl));
            // Always visible; blend mode ensures contrast over any background
            socialIcons.style.display = 'flex';
            
            // Handle video background
            if (data.video) {
                // Override Eva to use Kayak.mp4 explicitly
                const videoSrc = artistName === 'Eva Berghamar' ? 'Kayak.mp4' : data.video;
                videoBackground.src = `./assets/${videoSrc}`;
                videoBackground.style.display = 'block';
                videoBackground.style.opacity = '1';
                videoBackground.style.zIndex = '10';
                videoBackground.play().catch(e => console.log('Video play error:', e));
                console.log('Video should be visible now:', videoBackground.style.display);
            } else {
                videoBackground.style.display = 'none';
                videoBackground.pause();
            }
            
            // Light up selected plane: subtle emissive on texture materials
            planes.forEach(p => {
                const mats = Array.isArray(p.material) ? p.material : [p.material];
                // reset emissive
                [4,5].forEach(idx => {
                    if (mats[idx] && mats[idx].emissive) {
                        mats[idx].emissive.setHex(0x000000);
                        mats[idx].emissiveIntensity = 0.0;
                    }
                });
            });
            const mats = Array.isArray(clickedPlane.material) ? clickedPlane.material : [clickedPlane.material];
            [4,5].forEach(idx => {
                if (mats[idx]) {
                    mats[idx].emissive = new THREE.Color(textColor);
                    mats[idx].emissiveIntensity = 0.18;
                }
            });
            
            // Side banner for Agnes and Eva (Kayak)
            if (artistName === 'Agnes Hartwich') {
                sideBanner.src = './assets/AgnesCropped.png';
                sideBanner.style.display = 'block';
            } else if (artistName === 'Eva Berghamar') {
                sideBanner.src = './assets/Kayakcropped.png';
                sideBanner.style.display = 'block';
            } else {
                sideBanner.style.display = 'none';
            }
            
            // Update triangle indicator position above selected plane
            triangleIndicator.visible = true;
            triangleIndicator.position.copy(clickedPlane.position);
            triangleIndicator.position.y += planeSize * 0.95; // Position above plane with more space
            triangleIndicator.rotation.copy(clickedPlane.rotation);
            
            currentArtist = artistName;
        };
        
        // Show/update immediately without fade transitions
        updateOverlayContent();
        artistOverlay.style.display = 'block';
        artistOverlay.style.opacity = '1';
        overlayContent.style.opacity = '1';
    }
});

// ===== scroll → rotation =====
let targetRotation = 0;
let currentRotation = 0;

// Update rotation based on scroll - infinite rotation
function updateWheelRotation() {
  const scrollY = window.scrollY || window.pageYOffset;
  
  // Infinite rotation - no max, just keeps going
  targetRotation = (scrollY * 0.002); // Adjust 0.002 for speed
}

window.addEventListener('scroll', updateWheelRotation, { passive: true });

// easing for scale
function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ===== animation =====
function animate() {
  requestAnimationFrame(animate);

  // Smooth interpolation
  const easing = 0.04;
  const diff = targetRotation - currentRotation;
  currentRotation += diff * easing;

  wheelGroup.rotation.y = currentRotation;

  // Scale planes based on their position (front = bigger)
  planes.forEach((plane) => {
    // Calculate each plane's rotation angle relative to wheel rotation
    const planeAngle = plane.userData.index * (Math.PI / 2); // 0, 90, 180, 270 degrees
    const totalRotation = currentRotation + planeAngle;
    
    // Get the Z position (depth) - front facing has z pointing toward camera
    const normalizedZ = Math.cos(totalRotation);
    
    // When normalizedZ is close to 1, plane is facing forward (center)
    // Scale from 1.0 (sides/back) to 1.6 (center front)
    const focusAmount = Math.max(0, normalizedZ); // 0 to 1
    // Delay scaling - only start when very close to center
    const delayedFocus = Math.pow(focusAmount, 3); // Cubic power delays the effect
    const smoothFocus = easeInOutCubic(delayedFocus);
    const targetScale = 1 + (smoothFocus * 0.55);
    
    // Smooth interpolation
    const currentScale = plane.scale.x;
    const newScale = currentScale + (targetScale - currentScale) * 0.3;
    
    plane.scale.set(newScale, newScale, newScale);
  });

  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Responsive camera position
  if (window.innerWidth < 768) {
    camera.position.z = 8;
  } else {
    camera.position.z = 6;
  }
});

// Start animation
animate();
console.log('🎡 3D Wheel loaded!');
