import * as THREE from 'three';

// Global state flag for p5 background dimming
window.P5_BG_DIMMED = false;

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
renderer.outputColorSpace = THREE.SRGBColorSpace;
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
const imageFiles = ['LauraD.png', 'AgnesD.png', 'KayakD.png', 'RosaD.png'];
const artistNames = ['Laura', 'Agnes', 'Eva', 'Rosa'];
const artistAliases = ['LAURA4EVIGT', '', '', ''];
const artistDisplayNames = ['LAURA\n4EVIGT', 'AGNES\nHARTWICH', 'KAYAK', 'ROSA\nAF\nMANEN'];
const artistColors = [0xE94B3C, 0xCCDB3D, 0xF4A9C8, 0xB6EEB5]; // red, yellow-green, pink, mint
const planes = [];
const triangleOverlays = [];

for (let i = 0; i < 4; i++) {
  const texture = textureLoader.load(`./assets/${imageFiles[i]}`);
texture.colorSpace = THREE.SRGBColorSpace;
texture.premultiplyAlpha = false;
texture.generateMipmaps = false;
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
    
        // Use flat plane geometry to avoid visible side stripes
        const vinylGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.5,
            depthWrite: true,
            roughness: 0.1,
            metalness: 0.0,
            side: THREE.DoubleSide
        });
        const plane = new THREE.Mesh(vinylGeometry, material);
    
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
    
    // Use PNG triangle overlays per artist, aligned to right tip and smaller
    const triangleFiles = ['Laura_T.png', 'Agnes_T.png', 'Kayak_T.png', 'Rosa_T.png'];
    const triTexture = textureLoader.load(`./assets/${triangleFiles[i]}`);
    triTexture.colorSpace = THREE.SRGBColorSpace;
    triTexture.premultiplyAlpha = false;
    triTexture.generateMipmaps = false;
    triTexture.minFilter = THREE.LinearFilter;
    triTexture.magFilter = THREE.LinearFilter;
    
    // Triangle plane size is smaller than image plane
    const triSize = planeSize * 0.6; // 60% of image size
    const triangleGeometry = new THREE.PlaneGeometry(triSize, triSize);
    
    const triangleMaterial = new THREE.MeshBasicMaterial({
        map: triTexture,
        transparent: true,
        alphaTest: 0.1,  // Ignore pixels with alpha < 0.1 for raycasting
        side: THREE.DoubleSide,  // Show on both sides so triangles stay visible
        depthTest: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
    });
    
    const triangleOverlay = new THREE.Mesh(triangleGeometry, triangleMaterial);
    // Attach to plane and align so PNG tip meets the image's right tip
    plane.add(triangleOverlay);
    triangleOverlay.renderOrder = 2;
    
    // Position - Agnes and Rosa need opposite X and Z because their planes are rotated 180°
    if (i === 1 || i === 3) {
        // Agnes and Rosa - negative X and negative Z (both opposite)
        triangleOverlay.position.set(-(planeSize / 2 - triSize / 2), 0, -0.001);
        triangleOverlay.rotation.set(0, -Math.PI, 0);
    } else {
        // Laura and Kayak - positive X and positive Z (works perfectly already)
        triangleOverlay.position.set(planeSize / 2 - triSize / 2, 0, 0.001);
        triangleOverlay.rotation.set(0, 0, 0);
    }
    
    triangleOverlays.push(triangleOverlay);
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

// Triangle indicator removed - no longer needed

// Raycaster for click detection
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.1; // Threshold for point detection
// Note: Three.js raycaster doesn't have built-in alpha testing for meshes
// So we'll check triangle intersections separately

const mouse = new THREE.Vector2();

// Track hover state for triangle animations
let hoveredPlane = null;
let hoveredTriangle = null;
const triangleTargetY = {}; // Track target Y position for each triangle
const triangleHoverScale = {}; // Track scale for hover effect
triangleOverlays.forEach((tri, idx) => {
    triangleTargetY[idx] = 0; // Initial position
    triangleHoverScale[idx] = 1.0; // Initial scale
});

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
    'Laura': {
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
    'Agnes': {
        overtitle: 'AGNES',
        subtitle: 'HARTWICH',
        quote: '',
        description: '',
        label: '',
        video: 'Agnes.MP4',
        iconColor: '#FF8C00'
    },
    'Eva': {
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
    'Rosa': {
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
    z-index: 11;
    display: none;
    opacity: 0;
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
    z-index: 150;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    display: none;
`;
document.body.appendChild(overlayContent);

// Large artist name - REMOVED (user requested deletion)
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
    display: none;
`;
overlayContent.appendChild(largeName);

// Subtitle - REMOVED (user requested deletion of both names)
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
    display: none;
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

// Track which triangle is currently dropped (clicked)
let activeTriangle = null;

// Mousemove for hover detection on triangles
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const triangleIntersects = raycaster.intersectObjects(triangleOverlays);
    
    if (triangleIntersects.length > 0) {
        const triangleMesh = triangleIntersects[0].object;
        const planeIndex = triangleOverlays.indexOf(triangleMesh);
        
        if (planeIndex !== -1) {
            // Show pointer cursor only
            document.body.style.cursor = 'pointer';
            hoveredTriangle = planeIndex;
        }
    } else {
        // Reset cursor
        document.body.style.cursor = 'default';
        hoveredTriangle = null;
    }
});

// Click event listener
window.addEventListener('click', (event) => {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // Check for triangle clicks first (only colored areas due to alphaTest)
    const triangleIntersects = raycaster.intersectObjects(triangleOverlays);
    
    if (triangleIntersects.length > 0) {
        // Clicked on a triangle
        const triangleMesh = triangleIntersects[0].object;
        const planeIndex = triangleOverlays.indexOf(triangleMesh);
        
        if (planeIndex !== -1) {
            // TOGGLE: If clicking same active triangle, close overlay and pop back
            if (activeTriangle === planeIndex && currentArtist !== null) {
                // Pop triangle back up
                triangleTargetY[planeIndex] = 0;
                activeTriangle = null;
                
                // Hide artist content with smooth transition
                hideArtistContent();
            } else {
                // Reset previous active triangle
                if (activeTriangle !== null && activeTriangle !== planeIndex) {
                    triangleTargetY[activeTriangle] = 0;
                }
                
                // Drop the clicked triangle and keep it down
                activeTriangle = planeIndex;
                triangleTargetY[planeIndex] = -0.4;
                
                // Show artist content for this plane
                const clickedPlane = planes[planeIndex];
                const artistName = clickedPlane.userData.artistName;
                const data = artistData[artistName];
                
                showArtistContent(clickedPlane, artistName, data);
            }
        }
        return; // Don't check plane clicks if triangle was clicked
    }
    
    // Check for plane clicks
    const planeIntersects = raycaster.intersectObjects(planes);
    
    if (planeIntersects.length > 0) {
        const clickedPlane = planeIntersects[0].object;
        const planeIndex = clickedPlane.userData.index;
        const bgColor = clickedPlane.userData.backgroundColor;
        const artistName = clickedPlane.userData.artistName;
        const data = artistData[artistName];
        
        // Reset previous active triangle
        if (activeTriangle !== null && activeTriangle !== planeIndex) {
            triangleTargetY[activeTriangle] = 0;
        }
        
        // Drop the triangle for this plane - 50% less distance
        activeTriangle = planeIndex;
        triangleTargetY[planeIndex] = -0.4;
        
        showArtistContent(clickedPlane, artistName, data);
    }
});

// Function to hide artist content - back to wheel
function hideArtistContent() {
    // Smooth fade out
    overlayContent.style.opacity = '0';
    artistOverlay.style.opacity = '0';
    videoBackground.style.opacity = '0';
    
    // Restore p5 background to 100% opacity and remove blur
    const p5bg = document.getElementById('p5-background');
    p5bg.style.opacity = '1';
    p5bg.style.filter = 'blur(0px)';
    
    setTimeout(() => {
        overlayContent.style.display = 'none';
        artistOverlay.style.display = 'none';
        videoBackground.style.display = 'none';
        videoBackground.pause();
        videoBackground.src = '';
        sideBanner.style.display = 'none';
        currentArtist = null;
    }, 300); // Match transition duration
}

// Function to show artist content
function showArtistContent(clickedPlane, artistName, data) {
    const bgColor = clickedPlane.userData.backgroundColor;
    
    // If clicking same artist, toggle (hide)
    if (currentArtist === artistName && artistOverlay.style.opacity === '1') {
        hideArtistContent();
        return;
    }
    
    // Dim p5 background to 40% and blur when artist clicked
    const p5bg = document.getElementById('p5-background');
    p5bg.style.opacity = '0.4';
    p5bg.style.filter = 'blur(8px)';
    
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
                // Split name style (Agnes/Laura) - NO NAMES
                largeName.textContent = '';
                largeName.style.color = lightColor;
                // For Laura: break into three lines LAURA / KJELDGAARD / CHRISTENSEN
                if (artistName === 'Laura Kjeldgaard Christensen') {
                    // Remove middle name, show only last name
                    subtitle.textContent = '';
                } else {
                    subtitle.textContent = '';
                }
                subtitle.style.color = lightColor;
                subtitle.style.display = 'block';
            } else {
                // Other artists - NO NAMES
                largeName.textContent = '';
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
            
            currentArtist = artistName;
        };
        
        // Show/update with smooth transitions
        updateOverlayContent();
        artistOverlay.style.display = 'block';
        overlayContent.style.display = 'block';
        
        // Trigger fade in
        setTimeout(() => {
            artistOverlay.style.opacity = '1';
            overlayContent.style.opacity = '1';
        }, 10);
}

// ===== scroll → rotation =====
let targetRotation = 0;
let currentRotation = 0;

// Update rotation based on scroll - infinite rotation with balanced speed
function updateWheelRotation() {
  const scrollY = window.scrollY || window.pageYOffset;
  
  // Balanced scroll speed - not too slow, not too fast
  targetRotation = (scrollY * 0.0006); // Balanced for exploration
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

  // Animate triangle drops with ease
  triangleOverlays.forEach((tri, idx) => {
    const targetY = triangleTargetY[idx] || 0;
    const currentY = tri.position.y;
    // Smooth ease interpolation - much slower for easier animation
    const easeSpeed = 0.08;
    const newY = currentY + (targetY - currentY) * easeSpeed;
    tri.position.y = newY;
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
