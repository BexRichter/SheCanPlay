// Guitar strings with wave bending animation
class GuitarStrings {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.svg = null;
        this.strings = [];
        this.numStrings = 5;
        this.animationFrameId = null;
        
        // Guitar note frequencies
        this.notes = [164.81, 207.65, 246.94, 329.63, 415.30]; // E3, G#3, B3, E4, G#4
        
        this.init();
        this.animate();
    }
    
    init() {
        // Create SVG element
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '140'); // Narrower height
        this.svg.style.display = 'block';
        this.container.appendChild(this.svg);
        
        // Get dimensions
        const rect = this.svg.getBoundingClientRect();
        const width = rect.width;
        const height = 140;
        
        // Calculate string positions - minimal margins
        const margin = height * 0.12; // 12% margins top and bottom
        const spacing = (height - margin * 2) / (this.numStrings - 1);
        
        // Create strings
        for (let i = 0; i < this.numStrings; i++) {
            const y = margin + i * spacing;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('stroke', '#000000');
            path.setAttribute('stroke-width', '2.5');
            path.setAttribute('fill', 'none');
            path.style.cursor = 'pointer';
            
            const stringData = {
                element: path,
                baseY: y,
                currentWave: 0,
                targetWave: 0,
                hoverX: -1,
                isPlaying: false,
                oscillator: null,
                gainNode: null
            };
            
            this.strings.push(stringData);
            this.svg.appendChild(path);
            
            // Add hover events
            path.addEventListener('mouseenter', (e) => this.onStringHover(i, e));
            path.addEventListener('mousemove', (e) => this.onStringMove(i, e));
            path.addEventListener('mouseleave', () => this.onStringLeave(i));
        }
        
        // Audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Handle resize
        window.addEventListener('resize', () => this.updateDimensions());
        this.updateDimensions();
    }
    
    updateDimensions() {
        const rect = this.svg.getBoundingClientRect();
        this.width = rect.width;
        this.height = 140;
        
        // Update string base positions
        const margin = this.height * 0.12;
        const spacing = (this.height - margin * 2) / (this.numStrings - 1);
        this.strings.forEach((str, i) => {
            str.baseY = margin + i * spacing;
        });
    }
    
    onStringHover(index, e) {
        const string = this.strings[index];
        const rect = this.svg.getBoundingClientRect();
        string.hoverX = e.clientX - rect.left;
        string.targetWave = 35; // Wave amplitude adjusted for narrower canvas
        
        // Play sound
        this.playNote(index);
    }
    
    onStringMove(index, e) {
        const string = this.strings[index];
        const rect = this.svg.getBoundingClientRect();
        string.hoverX = e.clientX - rect.left;
    }
    
    onStringLeave(index) {
        const string = this.strings[index];
        string.targetWave = 0;
        string.hoverX = -1;
        
        // Stop sound
        this.stopNote(index);
    }
    
    playNote(index) {
        const string = this.strings[index];
        if (string.isPlaying) return;
        
        string.isPlaying = true;
        string.oscillator = this.audioContext.createOscillator();
        string.gainNode = this.audioContext.createGain();
        
        string.oscillator.connect(string.gainNode);
        string.gainNode.connect(this.audioContext.destination);
        
        string.oscillator.frequency.value = this.notes[index];
        string.oscillator.type = 'sine'; // Smoother, more pleasant tone
        
        // Slightly louder for better presence
        string.gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        
        string.oscillator.start();
    }
    
    stopNote(index) {
        const string = this.strings[index];
        if (!string.isPlaying) return;
        
        string.isPlaying = false;
        
        if (string.gainNode && string.oscillator) {
            const now = this.audioContext.currentTime;
            // Longer fade out for more sustained note (1.2s instead of 0.3s)
            string.gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
            string.oscillator.stop(now + 1.2);
        }
    }
    
    generateWavePath(string) {
        const segments = 150; // High resolution for smooth wave
        let pathData = `M 0 ${string.baseY}`;
        
        // Slower, more gradual interpolation for bendier motion
        string.currentWave += (string.targetWave - string.currentWave) * 0.08;
        
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const x = t * this.width;
            
            let y = string.baseY;
            
            if (string.currentWave > 0.1 && string.hoverX >= 0) {
                // Distance from hover point
                const distX = Math.abs(x - string.hoverX);
                
                // Wide falloff for long wave
                const falloff = 1 / Math.pow(distX / 250 + 1, 0.5);
                
                // Multiple sine waves for complex motion
                const wave1 = Math.sin(t * Math.PI * 3) * falloff;
                const wave2 = Math.sin(t * Math.PI * 5 + Date.now() * 0.01) * falloff * 0.3;
                
                const totalWave = (wave1 + wave2) * string.currentWave;
                y += totalWave;
            }
            
            pathData += ` L ${x} ${y}`;
        }
        
        return pathData;
    }
    
    animate() {
        this.strings.forEach(string => {
            const pathData = this.generateWavePath(string);
            string.element.setAttribute('d', pathData);
        });
        
        this.animationFrameId = requestAnimationFrame(() => this.animate());
    }
    
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.strings.forEach((_, i) => this.stopNote(i));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new GuitarStrings('strings-canvas');
});
