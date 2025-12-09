// P5.js DISKRET STRUKTUREL MUTATION SYSTEM
const cellSize = 20;
let gridCols, gridRows;
let grid = []; // 2D array: {type: 0=square/1=triangle, orientation: 0-3, colorIndex: 0-1}

// Artist-specific color palettes (TWO COLORS ONLY)
const artistPalettes = {
    laura: ['#F13D05', '#6DBBBF'],
    rosa: ['#A4BB1A', '#DDDDE2'],
    kayak: ['#F4A9C8', '#FA9405'],
    agnes: ['#9EC7A9', '#F4A9C8']
};

// Current state
let currentArtist = 'laura';
let currentColors = artistPalettes.laura;
let targetColors = artistPalettes.laura;
let colorTransition = 0;

// Scroll detection
let lastScrollY = 0;
let scrollVelocity = 0;
let isScrolling = false;
let scrollTimeout = null;

// Mutation tracking - ROLIGE SYSTEM SKIFT
let lastMutationTime = 0;
let mutationInterval = 1200; // Langsomme rolige skift

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('p5-background');
    canvas.id('p5-canvas');
    frameRate(30);
    noStroke();
    
    // Calculate grid dimensions
    gridCols = ceil(width / cellSize) + 1;
    gridRows = ceil(height / cellSize) + 1;
    
    // Initialize 2D grid with cell states
    initializeGrid();
    
    // Listen for scroll events
    window.addEventListener('scroll', handleScroll, { passive: true });
}

function initializeGrid() {
    grid = [];
    
    for (let row = 0; row < gridRows; row++) {
        grid[row] = [];
        for (let col = 0; col < gridCols; col++) {
            // Start med clean checkerboard - kun squares
            grid[row][col] = {
                type: 0,
                orientation: 0,
                colorIndex: (row + col) % 2
            };
        }
    }
}

function handleScroll() {
    const scrollY = window.scrollY || window.pageYOffset;
    scrollVelocity = Math.abs(scrollY - lastScrollY);
    lastScrollY = scrollY;
    
    isScrolling = true;
    
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        isScrolling = false;
        scrollVelocity = 0;
    }, 150);
    
    // Detect artist based on wheel rotation
    const wheelRotation = scrollY * 0.0006;
    const normalizedRotation = (wheelRotation % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    let frontArtistIndex = Math.round(normalizedRotation / (Math.PI / 2)) % 4;
    
    const artistNames = ['laura', 'agnes', 'kayak', 'rosa'];
    const detectedArtist = artistNames[frontArtistIndex];
    
    if (detectedArtist !== currentArtist) {
        currentArtist = detectedArtist;
        targetColors = artistPalettes[currentArtist];
        colorTransition = 0;
        
        // Trigger artist-specific pattern
        performArtistChange();
    }
}

function draw() {
    // Smooth color transition
    if (colorTransition < 1) {
        colorTransition += 0.12;
    }
    
    let color1 = lerpColor(
        color(currentColors[0]), 
        color(targetColors[0]), 
        colorTransition
    );
    let color2 = lerpColor(
        color(currentColors[1]), 
        color(targetColors[1]), 
        colorTransition
    );
    
    if (colorTransition >= 1) {
        currentColors = targetColors;
    }
    
    // Draw at full strength - opacity controlled by CSS
    background(color1);
    
    // MUTATION ENGINE: Only mutate during scroll
    if (isScrolling && scrollVelocity > 0) {
        const now = millis();
        if (now - lastMutationTime > mutationInterval) {
            performMutation();
            lastMutationTime = now;
        }
    }
    
    // Draw the static grid
    drawGrid(color1, color2);
}

function drawGrid(color1, color2) {
    noStroke();
    
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const cell = grid[row][col];
            const x = col * cellSize;
            const y = row * cellSize;
            
            if (cell.type === 0) {
                // SQUARE - single color
                const cellColor = cell.colorIndex === 0 ? color1 : color2;
                fill(cellColor);
                rect(x, y, cellSize, cellSize);
            } else {
                // TRIANGLE - split diagonal with two colors
                // Orientation: 0=↗(NE), 1=↘(SE), 2=↙(SW), 3=↖(NW)
                switch(cell.orientation) {
                    case 0: // ↗ Northeast
                        fill(color1);
                        triangle(x, y, x + cellSize, y, x + cellSize, y + cellSize);
                        fill(color2);
                        triangle(x, y, x, y + cellSize, x + cellSize, y + cellSize);
                        break;
                    case 1: // ↘ Southeast
                        fill(color1);
                        triangle(x + cellSize, y, x + cellSize, y + cellSize, x, y + cellSize);
                        fill(color2);
                        triangle(x, y, x + cellSize, y, x, y + cellSize);
                        break;
                    case 2: // ↙ Southwest
                        fill(color1);
                        triangle(x, y, x, y + cellSize, x + cellSize, y + cellSize);
                        fill(color2);
                        triangle(x, y, x + cellSize, y, x + cellSize, y + cellSize);
                        break;
                    case 3: // ↖ Northwest
                        fill(color1);
                        triangle(x, y, x + cellSize, y, x, y + cellSize);
                        fill(color2);
                        triangle(x + cellSize, y, x + cellSize, y + cellSize, x, y + cellSize);
                        break;
                }
            }
        }
    }
}

// ========== DISKRET MUTATION ENGINE ==========

function performArtistChange() {
    if (currentArtist === 'kayak') {
        // Kayak: KUN vertical split (to striber)
        createKayakVerticalSplit();
    } else if (currentArtist === 'agnes') {
        // Agnes: KUN søjler (vertical stripes)
        createAgnesColumns();
    } else {
        // Andre artister: normal global shift
        performGlobalShift();
    }
}

function createKayakVerticalSplit() {
    // To striber - vertical split
    const splitCol = floor(gridCols / 2);
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            grid[row][col] = {
                type: 0,
                orientation: 0,
                colorIndex: col < splitCol ? 0 : 1
            };
        }
    }
}

function createAgnesColumns() {
    // Søjler - vertical stripes med bred bredde
    const colWidth = floor(random(3, 6));
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            grid[row][col] = {
                type: 0,
                orientation: 0,
                colorIndex: floor(col / colWidth) % 2
            };
        }
    }
}

function performMutation() {
    // Artist-specific mutation behavior
    if (currentArtist === 'kayak') {
        // Kayak: Altid vertical split, ingen andre mutationer
        createKayakVerticalSplit();
        return;
    }
    
    if (currentArtist === 'agnes') {
        // Agnes: KUN søjler - ingen variationer
        createAgnesColumns();
        return;
    }
    
    // Andre artister: KUN fulde rolige system skift
    performGlobalShift();
}


function applyPattern(row, col, patternIndex) {
    switch(patternIndex) {
        case 0: // Checker
            return {
                type: 0,
                orientation: 0,
                colorIndex: (row + col) % 2
            };
        case 1: // Vertical stripes
            return {
                type: 0,
                orientation: 0,
                colorIndex: floor(col / 3) % 2
            };
        case 2: // Horizontal stripes
            return {
                type: 0,
                orientation: 0,
                colorIndex: floor(row / 3) % 2
            };
        case 3: // Diagonal triangles
            return {
                type: 1,
                orientation: (row + col) % 4,
                colorIndex: (row + col) % 2
            };
        case 4: // Block pattern
            return {
                type: floor((row / 4) + (col / 4)) % 2,
                orientation: 0,
                colorIndex: floor((row / 4) + (col / 4)) % 2
            };
        case 5: // Mixed triangles
            return {
                type: 1,
                orientation: floor(random(4)),
                colorIndex: floor(random(2))
            };
    }
}

function createTwoBlockSplit() {
    // SIMPEL 2-BLOK OPDELING
    const splitType = floor(random(4));
    
    switch(splitType) {
        case 0: // Horizontal split
            const splitRow = floor(gridRows / 2);
            for (let row = 0; row < gridRows; row++) {
                for (let col = 0; col < gridCols; col++) {
                    grid[row][col] = {
                        type: 0,
                        orientation: 0,
                        colorIndex: row < splitRow ? 0 : 1
                    };
                }
            }
            break;
            
        case 1: // Vertical split
            const splitCol = floor(gridCols / 2);
            for (let row = 0; row < gridRows; row++) {
                for (let col = 0; col < gridCols; col++) {
                    grid[row][col] = {
                        type: 0,
                        orientation: 0,
                        colorIndex: col < splitCol ? 0 : 1
                    };
                }
            }
            break;
            
        case 2: // Diagonal split
            for (let row = 0; row < gridRows; row++) {
                for (let col = 0; col < gridCols; col++) {
                    grid[row][col] = {
                        type: 0,
                        orientation: 0,
                        colorIndex: row > col ? 0 : 1
                    };
                }
            }
            break;
            
        case 3: // Quadrant split
            const midRow = floor(gridRows / 2);
            const midCol = floor(gridCols / 2);
            for (let row = 0; row < gridRows; row++) {
                for (let col = 0; col < gridCols; col++) {
                    const topLeft = row < midRow && col < midCol;
                    const bottomRight = row >= midRow && col >= midCol;
                    grid[row][col] = {
                        type: 0,
                        orientation: 0,
                        colorIndex: (topLeft || bottomRight) ? 0 : 1
                    };
                }
            }
            break;
    }
}





function performGlobalShift() {
    const shiftType = floor(random(8));
    
    switch(shiftType) {
        case 0: // Half-split horizontal
            const midRow = floor(gridRows / 2);
            for (let row = 0; row < gridRows; row++) {
                for (let col = 0; col < gridCols; col++) {
                    grid[row][col] = {
                        type: 0,
                        orientation: 0,
                        colorIndex: row < midRow ? 0 : 1
                    };
                }
            }
            break;
            
        case 1: // Half-split vertical
            const midCol = floor(gridCols / 2);
            for (let row = 0; row < gridRows; row++) {
                for (let col = 0; col < gridCols; col++) {
                    grid[row][col] = {
                        type: 0,
                        orientation: 0,
                        colorIndex: col < midCol ? 0 : 1
                    };
                }
            }
            break;
            
        case 2: // Diagonal zones
            for (let row = 0; row < gridRows; row++) {
                for (let col = 0; col < gridCols; col++) {
                    grid[row][col] = {
                        type: 0,
                        orientation: 0,
                        colorIndex: row > col ? 0 : 1
                    };
                }
            }
            break;
            
        case 3: // Checkerboard
            for (let row = 0; row < gridRows; row++) {
                for (let col = 0; col < gridCols; col++) {
                    grid[row][col] = {
                        type: 0,
                        orientation: 0,
                        colorIndex: (row + col) % 2
                    };
                }
            }
            break;
            
        case 4: // Big blocks
            const blockSize = floor(random(6, 12));
            for (let row = 0; row < gridRows; row++) {
                for (let col = 0; col < gridCols; col++) {
                    grid[row][col] = {
                        type: 0,
                        orientation: 0,
                        colorIndex: (floor(row / blockSize) + floor(col / blockSize)) % 2
                    };
                }
            }
            break;
            
        case 5: // Concentric circles
            const centerRow = floor(gridRows / 2);
            const centerCol = floor(gridCols / 2);
            const ringSize = floor(random(3, 6));
            for (let row = 0; row < gridRows; row++) {
                for (let col = 0; col < gridCols; col++) {
                    const dist = floor(sqrt(sq(row - centerRow) + sq(col - centerCol)));
                    grid[row][col] = {
                        type: 0,
                        orientation: 0,
                        colorIndex: floor(dist / ringSize) % 2
                    };
                }
            }
            break;
            
        case 6: // Quadrant split
            const qMidRow = floor(gridRows / 2);
            const qMidCol = floor(gridCols / 2);
            for (let row = 0; row < gridRows; row++) {
                for (let col = 0; col < gridCols; col++) {
                    const topLeft = row < qMidRow && col < qMidCol;
                    const bottomRight = row >= qMidRow && col >= qMidCol;
                    grid[row][col] = {
                        type: 0,
                        orientation: 0,
                        colorIndex: (topLeft || bottomRight) ? 0 : 1
                    };
                }
            }
            break;
            
        case 7: // Triangle wave field
            const waveSize = floor(random(3, 7));
            for (let row = 0; row < gridRows; row++) {
                for (let col = 0; col < gridCols; col++) {
                    grid[row][col] = {
                        type: 1,
                        orientation: floor((row + col) / waveSize) % 4,
                        colorIndex: (row + col) % 2
                    };
                }
            }
            break;
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    gridCols = ceil(width / cellSize) + 1;
    gridRows = ceil(height / cellSize) + 1;
    initializeGrid();
}
