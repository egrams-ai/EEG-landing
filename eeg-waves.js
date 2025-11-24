// EEG Bioelectric Wave Visualization
// Mô phỏng sóng điện não đồ như trong y học

class EEGWaveform {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.animationFrame = null;
        
        // Configuration
        this.config = {
            channels: options.channels || 16, // Số kênh EEG
            waveSpeed: options.waveSpeed || 2, // Tốc độ chạy (pixels/frame)
            amplitude: options.amplitude || 20, // Biên độ sóng
            frequency: options.frequency || 0.02, // Tần số sóng
            gridColor: options.gridColor || 'rgba(100, 255, 200, 0.15)',
            waveColor: options.waveColor || '#2dd4bf',
            backgroundColor: options.backgroundColor || '#0f1419',
            showGrid: options.showGrid !== false,
            showLabels: options.showLabels !== false,
            spikeChance: options.spikeChance || 0.005 // Xác suất xuất hiện spike
        };
        
        // Màu sắc cho từng kênh (16 màu khác nhau)
        this.channelColors = [
            '#2dd4bf', // Cyan - FP1-F7
            '#60a5fa', // Blue - F7-T3
            '#a78bfa', // Purple - T3-T5
            '#f472b6', // Pink - T5-O1
            '#fb923c', // Orange - FP2-F8
            '#fbbf24', // Yellow - F8-T4
            '#4ade80', // Green - T4-T6
            '#34d399', // Emerald - T6-O2
            '#22d3ee', // Sky - FP1-F3
            '#818cf8', // Indigo - F3-C3
            '#c084fc', // Violet - C3-P3
            '#f9a8d4', // Light Pink - P3-O1
            '#fdba74', // Light Orange - FP2-F4
            '#fcd34d', // Light Yellow - F4-C4
            '#86efac', // Light Green - C4-P4
            '#6ee7b7'  // Light Emerald - P4-O2
        ];
        
        // Channel labels (giống trong ảnh EEG)
        this.channelLabels = [
            'FP1-F7', 'F7-T3', 'T3-T5', 'T5-O1',
            'FP2-F8', 'F8-T4', 'T4-T6', 'T6-O2',
            'FP1-F3', 'F3-C3', 'C3-P3', 'P3-O1',
            'FP2-F4', 'F4-C4', 'C4-P4', 'P4-O2'
        ];
        
        this.offset = 0;
        this.waveData = [];
        this.spikes = []; // Các điểm spike đặc biệt
        
        // Indicator lights (đèn báo y tế)
        this.indicators = [];
        this.lastIndicatorTime = 0;
        
        this.init();
    }
    
    init() {
        this.resize();
        this.initWaveData();
        this.animate();
        
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.width = rect.width;
        this.height = rect.height;
        this.channelHeight = this.height / this.config.channels;
    }
    
    initWaveData() {
        // Khởi tạo data cho mỗi kênh - Mỗi kênh có đặc tính riêng
        for (let i = 0; i < this.config.channels; i++) {
            // Các vùng não khác nhau có pattern khác nhau
            const isFrontal = i < 4; // FP1-F7, F7-T3, etc.
            const isTemporal = i >= 4 && i < 8;
            const isParietal = i >= 8 && i < 12;
            const isOccipital = i >= 12;
            
            this.waveData[i] = {
                phase: Math.random() * Math.PI * 2,
                frequency: this.config.frequency * (0.85 + Math.random() * 0.3),
                amplitude: this.config.amplitude * (0.6 + Math.random() * 0.3), // Giảm range để không overlap
                noise: 0.08 + Math.random() * 0.12, // Giảm noise
                // Đặc tính riêng theo vùng não
                alphaStrength: isFrontal ? 0.6 : (isParietal ? 1.0 : 0.8),
                betaStrength: isFrontal ? 0.8 : 0.4,
                thetaStrength: isTemporal ? 0.9 : 0.5,
                deltaStrength: isFrontal ? 0.4 : 0.3
            };
        }
    }
    
    drawGrid() {
        if (!this.config.showGrid) return;
        
        this.ctx.strokeStyle = this.config.gridColor;
        this.ctx.lineWidth = 1;
        
        // Vertical lines (time grid)
        const verticalSpacing = 50;
        for (let x = 0; x < this.width; x += verticalSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines (channel separators)
        for (let i = 0; i <= this.config.channels; i++) {
            const y = i * this.channelHeight;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
        
        // Thicker middle lines cho mỗi channel
        this.ctx.strokeStyle = this.config.gridColor.replace('0.15', '0.3');
        for (let i = 0; i < this.config.channels; i++) {
            const y = i * this.channelHeight + this.channelHeight / 2;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }
    
    drawLabels() {
        if (!this.config.showLabels) return;
        
        this.ctx.font = 'bold 11px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        
        for (let i = 0; i < this.config.channels; i++) {
            const y = i * this.channelHeight + this.channelHeight / 2;
            const label = this.channelLabels[i] || `Ch ${i + 1}`;
            
            // Dùng màu tương ứng với kênh
            this.ctx.fillStyle = this.channelColors[i];
            this.ctx.fillText(label, 10, y);
        }
    }
    
    generateSpike() {
        // Ngẫu nhiên tạo spike (như trong EEG có thể có epileptiform discharge)
        if (Math.random() < this.config.spikeChance) {
            const channel = Math.floor(Math.random() * this.config.channels);
            this.spikes.push({
                channel: channel,
                x: this.width,
                amplitude: this.config.amplitude * (1.5 + Math.random() * 1.5), // 1.5-3x - nhỏ hơn
                width: 30 + Math.random() * 20, // Rộng hơn - mềm hơn
                type: Math.random() > 0.6 ? 'sharp' : 'spike'
            });
        }
        
        // Remove old spikes
        this.spikes = this.spikes.filter(spike => spike.x > -50);
    }
    
    generateIndicators() {
        // Tạo đèn báo ngẫu nhiên (0.5-1.5 giây mới xuất hiện)
        const now = Date.now();
        if (now - this.lastIndicatorTime > 500 + Math.random() * 1000) {
            const channel = Math.floor(Math.random() * this.config.channels);
            this.indicators.push({
                channel: channel,
                x: this.width - 80, // Vị trí bên phải
                color: this.channelColors[channel],
                alpha: 1,
                radius: 5,
                lifetime: 0,
                maxLifetime: 80 + Math.random() * 60 // 80-140 frames (~1.5-2.5 giây)
            });
            this.lastIndicatorTime = now;
        }
    }
    
    updateIndicators() {
        // Update và remove old indicators
        this.indicators = this.indicators.filter(indicator => {
            indicator.lifetime++;
            // Fade in/out effect
            if (indicator.lifetime < 15) {
                indicator.alpha = indicator.lifetime / 15;
            } else if (indicator.lifetime > indicator.maxLifetime - 15) {
                indicator.alpha = (indicator.maxLifetime - indicator.lifetime) / 15;
            } else {
                // Nhấp nháy (blink) - mạnh hơn
                indicator.alpha = 0.5 + Math.sin(indicator.lifetime * 0.2) * 0.5;
            }
            return indicator.lifetime < indicator.maxLifetime;
        });
    }
    
    drawIndicators() {
        // Vẽ các đèn báo nhỏ
        this.indicators.forEach(indicator => {
            const y = indicator.channel * this.channelHeight + this.channelHeight / 2;
            
            // Outer glow
            const glowAlpha = Math.floor(indicator.alpha * 255).toString(16).padStart(2, '0');
            const gradient = this.ctx.createRadialGradient(
                indicator.x, y, 0,
                indicator.x, y, indicator.radius * 3
            );
            gradient.addColorStop(0, indicator.color + glowAlpha);
            gradient.addColorStop(0.5, indicator.color + '40');
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(indicator.x, y, indicator.radius * 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Inner bright circle
            this.ctx.globalAlpha = indicator.alpha;
            this.ctx.fillStyle = indicator.color;
            this.ctx.beginPath();
            this.ctx.arc(indicator.x, y, indicator.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Core bright center (super bright)
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(indicator.x, y, indicator.radius * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
    }
    
    drawWaves() {
        this.ctx.lineWidth = 1.3; // Mảnh hơn - giống EEG thật
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Draw each channel
        for (let channel = 0; channel < this.config.channels; channel++) {
            const centerY = channel * this.channelHeight + this.channelHeight / 2;
            const waveInfo = this.waveData[channel];
            
            // Màu riêng cho từng kênh
            const channelColor = this.channelColors[channel];
            this.ctx.strokeStyle = channelColor;
            this.ctx.shadowBlur = 0; // Không glow
            this.ctx.shadowColor = 'transparent';
            
            this.ctx.beginPath();
            
            // Draw continuous wave - REAL EEG SIMULATION
            for (let x = 0; x < this.width + 10; x += 1.5) {
                const time = (x + this.offset) * waveInfo.frequency;
                
                // Base wave - Tạo sóng THỰC TẾ phức tạp (không phải sin đơn giản)
                let y = 0;
                
                // 1. Alpha wave (8-13 Hz) - Dominant rhythm
                const alpha1 = Math.sin(time * 10 + waveInfo.phase) * waveInfo.amplitude * 0.7;
                const alpha2 = Math.sin(time * 11.5 + waveInfo.phase * 1.1) * waveInfo.amplitude * 0.3;
                y += alpha1 + alpha2;
                
                // 2. Beta wave (13-30 Hz) - Fast activity
                const beta1 = Math.sin(time * 20 + waveInfo.phase * 1.5) * waveInfo.amplitude * 0.15;
                const beta2 = Math.sin(time * 25 + waveInfo.phase * 1.8) * waveInfo.amplitude * 0.1;
                y += beta1 + beta2;
                
                // 3. Theta wave (4-8 Hz) - Slower waves
                const theta1 = Math.sin(time * 6 + waveInfo.phase * 0.7) * waveInfo.amplitude * 0.4;
                const theta2 = Math.sin(time * 7.5 + waveInfo.phase * 0.9) * waveInfo.amplitude * 0.25;
                y += theta1 + theta2;
                
                // 4. Delta wave (0.5-4 Hz) - Very slow
                const delta = Math.sin(time * 2 + waveInfo.phase * 0.5) * waveInfo.amplitude * 0.3;
                y += delta;
                
                // 5. Harmonic components - Tạo độ phức tạp
                y += Math.sin(time * 15 + waveInfo.phase * 2) * waveInfo.amplitude * 0.12;
                y += Math.sin(time * 30 + waveInfo.phase * 3) * waveInfo.amplitude * 0.08;
                
                // 6. Non-sinusoidal components - Tạo góc cạnh tự nhiên
                const sharpness = Math.sin(time * 12) * Math.cos(time * 8);
                y += sharpness * waveInfo.amplitude * 0.15;
                
                // 7. Asymmetric waveform (Sóng não thường không đối xứng)
                const asymmetry = Math.pow(Math.abs(Math.sin(time * 8)), 1.5) * Math.sign(Math.sin(time * 8));
                y += asymmetry * waveInfo.amplitude * 0.2;
                
                // Không dùng spike nữa - bỏ phần check spike
                
                const finalY = centerY + y;
                
                if (x === 0) {
                    this.ctx.moveTo(x, finalY);
                } else {
                    this.ctx.lineTo(x, finalY);
                }
            }
            
            this.ctx.stroke();
        }
        
        // Không cần move spikes nữa
    }
    
    drawScanLine() {
        // Vertical scan line (như oscilloscope)
        const scanX = (this.offset * this.config.waveSpeed) % this.width;
        
        const gradient = this.ctx.createLinearGradient(scanX - 20, 0, scanX + 20, 0);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, this.config.waveColor + '60');
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(scanX - 20, 0, 40, this.height);
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = this.config.backgroundColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw waves
        this.drawWaves();
        
        // Draw labels
        this.drawLabels();
        
        // Draw indicator lights (đèn báo)
        this.drawIndicators();
        
        // Không vẽ annotations nữa
        
        // Draw info overlay
        this.drawInfoOverlay();
    }
    
    drawInfoOverlay() {
        // Scale bar THẬT (như trong EEG lâm sàng)
        const scaleX = this.width - 150;
        const scaleY = this.height - 70;
        
        // Background với viền
        this.ctx.fillStyle = 'rgba(15, 20, 25, 0.85)';
        this.ctx.fillRect(scaleX - 12, scaleY - 12, 145, 60);
        this.ctx.strokeStyle = 'rgba(45, 212, 191, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(scaleX - 12, scaleY - 12, 145, 60);
        
        // Vertical scale (400 µV) - Thang đo biên độ
        this.ctx.strokeStyle = this.config.waveColor;
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(scaleX, scaleY);
        this.ctx.lineTo(scaleX, scaleY + 35);
        // Thêm mũi tên lên xuống
        this.ctx.moveTo(scaleX - 3, scaleY + 5);
        this.ctx.lineTo(scaleX, scaleY);
        this.ctx.lineTo(scaleX + 3, scaleY + 5);
        this.ctx.moveTo(scaleX - 3, scaleY + 30);
        this.ctx.lineTo(scaleX, scaleY + 35);
        this.ctx.lineTo(scaleX + 3, scaleY + 30);
        this.ctx.stroke();
        
        // Horizontal scale (1 sec) - Thang đo thời gian
        this.ctx.beginPath();
        this.ctx.moveTo(scaleX, scaleY + 35);
        this.ctx.lineTo(scaleX + 60, scaleY + 35);
        // Thêm mũi tên trái phải
        this.ctx.moveTo(scaleX + 5, scaleY + 32);
        this.ctx.lineTo(scaleX, scaleY + 35);
        this.ctx.lineTo(scaleX + 5, scaleY + 38);
        this.ctx.moveTo(scaleX + 55, scaleY + 32);
        this.ctx.lineTo(scaleX + 60, scaleY + 35);
        this.ctx.lineTo(scaleX + 55, scaleY + 38);
        this.ctx.stroke();
        
        // Labels với style y khoa
        this.ctx.fillStyle = this.config.waveColor;
        this.ctx.font = 'bold 12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('400 µV', scaleX + 8, scaleY + 18);
        this.ctx.fillText('1 sec', scaleX + 18, scaleY + 50);
        
        // Thêm filter info (như EEG thật)
        this.ctx.font = '9px monospace';
        this.ctx.fillStyle = 'rgba(45, 212, 191, 0.6)';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('0.5-70 Hz', this.width - 10, 20);
        this.ctx.fillText('Notch: 50Hz', this.width - 10, 32);
    }
    
    drawAnnotations() {
        // Thêm annotations y khoa (mũi tên, highlight)
        // Chỉ hiện khi có spike hoặc pattern đặc biệt
        this.spikes.forEach(spike => {
            if (spike.amplitude > this.config.amplitude * 2.5 && spike.x > 100 && spike.x < this.width - 100) {
                const y = spike.channel * this.channelHeight + this.channelHeight / 2;
                
                // Vẽ mũi tên chỉ spike
                this.ctx.strokeStyle = '#ff6b6b';
                this.ctx.fillStyle = '#ff6b6b';
                this.ctx.lineWidth = 2;
                
                // Arrow shaft
                this.ctx.beginPath();
                this.ctx.moveTo(spike.x, y - 40);
                this.ctx.lineTo(spike.x, y - 20);
                this.ctx.stroke();
                
                // Arrow head
                this.ctx.beginPath();
                this.ctx.moveTo(spike.x, y - 20);
                this.ctx.lineTo(spike.x - 4, y - 28);
                this.ctx.lineTo(spike.x + 4, y - 28);
                this.ctx.closePath();
                this.ctx.fill();
                
                // Label
                this.ctx.font = '10px monospace';
                this.ctx.fillStyle = '#ff6b6b';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('Sharp', spike.x, y - 45);
            }
        });
    }
    
    update() {
        this.offset += this.config.waveSpeed;
        // Tắt spike generation
        // this.generateSpike();
        
        // Generate indicator lights
        this.generateIndicators();
        this.updateIndicators();
    }
    
    animate() {
        this.update();
        this.draw();
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
    
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        window.removeEventListener('resize', this.resize);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEEGWaves);
} else {
    initEEGWaves();
}

function initEEGWaves() {
    // Initialize REAL EEG waveform for hero section
    const heroEEG = new EEGWaveform('heroEEGCanvas', {
        channels: 16,
        waveSpeed: 1.5, // Chậm hơn - giống EEG thực
        amplitude: 8, // Giảm xuống để các channels không đè lên nhau
        frequency: 0.025, // Điều chỉnh để có 10Hz alpha
        gridColor: 'rgba(45, 212, 191, 0.12)',
        waveColor: '#2dd4bf',
        backgroundColor: '#0f1419',
        showGrid: true,
        showLabels: true,
        spikeChance: 0.004 // Spike tự nhiên
    });
    
    // Initialize background EEG waves
    initBackgroundWaves();
}

// Background EEG Waves (for .eeg-waves-container)
function initBackgroundWaves() {
    const container = document.querySelector('.eeg-waves-container');
    if (!container) return;
    
    // Create canvas for multi-channel EEG waves
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    let animationId;
    let mouseX = -1000;
    let mouseY = -1000;
    let targetMouseX = -1000;
    let targetMouseY = -1000;
    
    // Configuration
    const config = {
        channels: 12, // Tăng từ 8 lên 12 kênh EEG ngang
        waveSpeed: 0.8,
        amplitude: 20, // Tăng từ 15 lên 20
        frequency: 0.02,
        mouseInfluence: 250, // Tăng từ 150 lên 250 - ảnh hưởng rộng hơn
        magnetStrength: 0.7 // Giảm từ 1.2 xuống 0.7 - lực hút nhẹ hơn
    };
    
    let offset = 0;
    let width, height, channelHeight;
    
    // Channel colors (theo theme của bạn) - mở rộng cho 12 kênh
    const channelColors = [
        '#00B3C7', // Cyan
        '#6B6BFF', // Indigo
        '#FF8C42', // Orange
        '#B7F171', // Lime
        '#00B3C7', // Cyan
        '#6B6BFF', // Indigo
        '#FF8C42', // Orange
        '#B7F171', // Lime
        '#00B3C7', // Cyan
        '#6B6BFF', // Indigo
        '#FF8C42', // Orange
        '#B7F171'  // Lime
    ];
    
    // Initialize wave data for each channel
    const waveData = [];
    for (let i = 0; i < config.channels; i++) {
        waveData[i] = {
            phase: Math.random() * Math.PI * 2,
            frequency: config.frequency * (0.9 + Math.random() * 0.2),
            amplitude: config.amplitude * (0.8 + Math.random() * 0.4),
            noiseOffset: Math.random() * 1000
        };
    }
    
    function resize() {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        width = rect.width;
        height = rect.height;
        channelHeight = height / config.channels;
    }
    
    // Mouse tracking với smooth interpolation (nghe trên window để không bị lớp khác đè)
    const onMouseMove = (e) => {
        const rect = container.getBoundingClientRect();
        targetMouseX = e.clientX - rect.left;
        targetMouseY = e.clientY - rect.top;
    };
    const onMouseOut = (e) => {
        // Khi chuột rời khỏi cửa sổ hoặc ngoài container
        if (e.relatedTarget === null || !container.contains(e.relatedTarget)) {
            targetMouseX = -1000;
            targetMouseY = -1000;
        }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseout', onMouseOut);
    
    // Generate realistic EEG wave with mouse influence
    function generateWave(channelIndex, centerY, time) {
        ctx.beginPath();
        
        const waveInfo = waveData[channelIndex];
        const color = channelColors[channelIndex];
        
        for (let x = 0; x < width; x += 2) {
            const t = (x + offset) * waveInfo.frequency;
            
            // Base EEG signal (multi-frequency composition)
            let y = 0;
            
            // Alpha wave (8-13 Hz)
            y += Math.sin(t * 10 + waveInfo.phase) * waveInfo.amplitude * 0.5;
            y += Math.sin(t * 11 + waveInfo.phase * 1.1) * waveInfo.amplitude * 0.2;
            
            // Beta wave (13-30 Hz)
            y += Math.sin(t * 20 + waveInfo.phase * 1.5) * waveInfo.amplitude * 0.15;
            
            // Theta wave (4-8 Hz)
            y += Math.sin(t * 6 + waveInfo.phase * 0.7) * waveInfo.amplitude * 0.3;
            
            // Delta wave (0.5-4 Hz)
            y += Math.sin(t * 2 + waveInfo.phase * 0.5) * waveInfo.amplitude * 0.2;
            
            // Noise
            y += (Math.sin(t * 50 + waveInfo.noiseOffset) * 0.5 - 0.25) * waveInfo.amplitude * 0.1;
            
            // ===== MOUSE MAGNETIC EFFECT =====
            if (mouseX > -500) {
                const dx = x - mouseX;
                const dy = centerY - mouseY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < config.mouseInfluence) {
                    // Độ ảnh hưởng giảm dần theo khoảng cách
                    const influence = 1 - (distance / config.mouseInfluence);
                    const pullStrength = Math.pow(influence, 1.5); // Smooth falloff
                    
                    // Kéo sóng về phía chuột (hiệu ứng từ trường) - MẠNH HƠN
                    const pullY = -dy * pullStrength * config.magnetStrength;
                    y += pullY;
                    
                    // Thêm hiệu ứng "ripple" xung quanh chuột - giảm cường độ (≈8 thay vì 12)
                    const ripple = Math.sin(distance * 0.08 - time * 0.08) * pullStrength * 8;
                    y += ripple;
                    
                    // Thêm hiệu ứng "squeeze" (nén ngang) khi chuột gần
                    const squeeze = Math.cos(dx * 0.02) * pullStrength * 8;
                    y += squeeze;
                }
            }
            
            const finalY = centerY + y;
            
            if (x === 0) {
                ctx.moveTo(x, finalY);
            } else {
                ctx.lineTo(x, finalY);
            }
        }
        
        // Stroke style - Tăng độ dày kênh
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5; // Tăng từ 1.8 lên 2.5 - kênh dày hơn
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Glow effect khi chuột gần - giảm peak để nhẹ nhàng hơn (peak ~7-8)
        if (mouseX > -500) {
            const distanceToChannel = Math.abs(centerY - mouseY);
            if (distanceToChannel < config.mouseInfluence) {
                const glowIntensity = 1 - (distanceToChannel / config.mouseInfluence);
                // Base nhỏ + multiplier để peak khoảng 7-8
                ctx.shadowBlur = 2 + glowIntensity * 6; // ~2 .. 8
                ctx.shadowColor = color;
                // Line width tăng nhẹ khi hover (từ 2.5)
                ctx.lineWidth = 2.5 + glowIntensity * 0.6; // ~2.5 .. 3.1
            } else {
                ctx.shadowBlur = 0;
                ctx.lineWidth = 2.5;
            }
        } else {
            ctx.shadowBlur = 0;
            ctx.lineWidth = 2.5;
        }
        
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    
    function animate() {
        // Smooth mouse interpolation - NHANH HƠN
        mouseX += (targetMouseX - mouseX) * 0.25; // Tăng từ 0.15 lên 0.25
        mouseY += (targetMouseY - mouseY) * 0.25;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw all channels
        for (let i = 0; i < config.channels; i++) {
            const centerY = i * channelHeight + channelHeight / 2;
            generateWave(i, centerY, offset);
        }
        
        // Update offset for animation
        offset += config.waveSpeed;
        
        animationId = requestAnimationFrame(animate);
    }
    
    // Initialize
    resize();
    animate();
    
    window.addEventListener('resize', resize);
    
    // Cleanup
    return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', resize);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseout', onMouseOut);
    };
}

// Remove old SVG-based functions (not needed anymore)
