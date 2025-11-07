// Brain Network Visualization - Main Script

class BrainNetwork {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.connections = [];
        this.animationFrame = null;
        
        // Configuration
        this.config = {
            particleCount: options.particleCount || 80,
            maxDistance: options.maxDistance || 150,
            particleSize: options.particleSize || 3,
            particleColor: options.particleColor || '#ff8c42',
            lineColor: options.lineColor || '#ff8c42',
            particleSpeed: options.particleSpeed || 0.3,
            rotationSpeed: options.rotationSpeed || 0.001,
            brainShape: options.brainShape !== false,
            pulseEffect: options.pulseEffect !== false
        };
        
        this.rotation = 0;
        this.pulsePhase = 0;
        
        this.init();
    }
    
    // Tạo hình dạng não 3D chính xác dựa trên ảnh reference
    getBrainShapeRadius(theta, phi) {
        // theta: góc xoay quanh trục Y (0 to 2π)
        // phi: góc từ trên xuống (0 to π)
        
        let radius = 80; // base radius
        
        // Normalize angles
        const normTheta = ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const normPhi = Math.max(0, Math.min(Math.PI, phi));
        
        // FRONTAL LOBE (trán) - phía trước, phình to
        // Front center bulge
        if (normTheta > Math.PI * 0.3 && normTheta < Math.PI * 0.7) {
            const frontFactor = Math.cos((normTheta - Math.PI * 0.5) * 3) * 0.5 + 0.5;
            const topFactor = Math.pow(Math.sin(normPhi), 0.7);
            radius += frontFactor * topFactor * 35;
        }
        
        // PARIETAL LOBE (đỉnh) - phần trên cùng
        if (normPhi < Math.PI * 0.4) {
            const topBulge = Math.pow(Math.sin(normPhi * 2.5), 2);
            radius += topBulge * 25;
        }
        
        // OCCIPITAL LOBE (chẩm) - phía sau, hơi nhô ra
        if (normTheta > Math.PI * 1.3 && normTheta < Math.PI * 1.7) {
            const backFactor = Math.cos((normTheta - Math.PI * 1.5) * 4) * 0.5 + 0.5;
            const midFactor = Math.sin(normPhi) * Math.sin(normPhi);
            radius += backFactor * midFactor * 22;
        }
        
        // TEMPORAL LOBE (thái dương) - hai bên, phần giữa phình ra
        const sideDistance = Math.abs(Math.cos(normTheta));
        if (normPhi > Math.PI * 0.45 && normPhi < Math.PI * 0.75) {
            const temporalBulge = sideDistance * Math.pow(Math.sin((normPhi - Math.PI * 0.45) * 3.3), 2);
            radius += temporalBulge * 28;
        }
        
        // CEREBELLUM (tiểu não) - phía sau dưới, khối tròn nhỏ
        if (normTheta > Math.PI * 1.4 && normTheta < Math.PI * 1.8 && 
            normPhi > Math.PI * 0.65 && normPhi < Math.PI * 0.85) {
            const cerebellumX = Math.cos((normTheta - Math.PI * 1.6) * 5) * 0.5 + 0.5;
            const cerebellumY = Math.cos((normPhi - Math.PI * 0.75) * 10) * 0.5 + 0.5;
            radius += cerebellumX * cerebellumY * 18;
        }
        
        // BRAIN STEM (thân não) - phía sau dưới cùng, thắt lại
        if (normTheta > Math.PI * 1.45 && normTheta < Math.PI * 1.75 && normPhi > Math.PI * 0.8) {
            const stemFactor = Math.pow(Math.sin((normPhi - Math.PI * 0.8) * 5), 2);
            radius -= stemFactor * 25; // Thu hẹp lại
        }
        
        // Làm phẳng một chút ở hai bên (não không tròn hoàn toàn)
        const sideFlattening = Math.pow(Math.abs(Math.cos(normTheta)), 3);
        radius -= sideFlattening * 8;
        
        // Gợn sóng bề mặt (cortical folds) - rất nhỏ
        const surfaceDetail = Math.sin(normTheta * 8) * Math.cos(normPhi * 12) * 2 +
                             Math.sin(normTheta * 15) * Math.sin(normPhi * 18) * 1.5;
        radius += surfaceDetail;
        
        // Proportions để tạo hình não dài hơn, không phải hình cầu
        const lengthFactor = 1.0 + Math.abs(Math.sin(normTheta)) * 0.3; // Dài hơn theo trục trước-sau
        const heightFactor = 0.85; // Thấp hơn một chút
        
        return {
            radius: radius * lengthFactor,
            heightScale: heightFactor
        };
    }
    
    init() {
        this.resize();
        this.createParticles();
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
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
    }
    
    createParticles() {
        this.particles = [];
        
        for (let i = 0; i < this.config.particleCount; i++) {
            let x, y, z;
            
            if (this.config.brainShape) {
                // Tạo điểm ngẫu nhiên theo hình dạng não thực tế
                const u = Math.random();
                const v = Math.random();
                
                // Convert to spherical coordinates
                const theta = u * Math.PI * 2; // góc xoay ngang (0 to 2π)
                const phi = v * Math.PI; // góc từ trên xuống (0 to π)
                
                // Lấy radius tùy theo vị trí (hình não) - SỬ DỤNG HÀM MỚI
                const brainShape = this.getBrainShapeRadius(theta, phi);
                const radius = brainShape.radius;
                const heightScale = brainShape.heightScale;
                
                // Tính tọa độ 3D từ spherical coordinates
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
                const sinTheta = Math.sin(theta);
                const cosTheta = Math.cos(theta);
                
                // Standard spherical to cartesian
                x = radius * sinPhi * cosTheta;
                y = radius * cosPhi * heightScale; // apply height scaling
                z = radius * sinPhi * sinTheta;
                
                // Điều chỉnh tỷ lệ để não trông tự nhiên hơn
                // Não dài hơn theo trục X (trước-sau)
                x *= 1.4;
                // Não hẹp hơn theo trục Z (trái-phải khi nhìn từ bên)
                z *= 0.75;
                
                // Thêm nhiễu nhỏ cho bề mặt tự nhiên hơn
                const noise = (Math.random() - 0.5) * 4;
                x += noise;
                y += noise * 0.8;
                z += noise * 0.6;
                
            } else {
                // Fallback: hình cầu đơn giản
                const radius = 100 + Math.random() * 80;
                const phi = Math.random() * Math.PI * 2;
                const theta = Math.random() * Math.PI;
                
                x = radius * Math.sin(theta) * Math.cos(phi);
                y = radius * Math.sin(theta) * Math.sin(phi);
                z = radius * Math.cos(theta);
            }
            
            this.particles.push({
                x, y, z,
                originalX: x,
                originalY: y,
                originalZ: z,
                vx: (Math.random() - 0.5) * this.config.particleSpeed,
                vy: (Math.random() - 0.5) * this.config.particleSpeed,
                vz: (Math.random() - 0.5) * this.config.particleSpeed,
                size: this.config.particleSize * (0.8 + Math.random() * 0.4)
            });
        }
    }
    
    rotatePoint(x, y, z, rotationX = 0, rotationY = 0) {
        // Rotate around Y axis
        let cosY = Math.cos(rotationY);
        let sinY = Math.sin(rotationY);
        let tempX = x * cosY - z * sinY;
        let tempZ = x * sinY + z * cosY;
        
        // Rotate around X axis
        let cosX = Math.cos(rotationX);
        let sinX = Math.sin(rotationX);
        let tempY = y * cosX - tempZ * sinX;
        tempZ = y * sinX + tempZ * cosX;
        
        return { x: tempX, y: tempY, z: tempZ };
    }
    
    projectPoint(x, y, z) {
        // Perspective projection
        const fov = 500;
        const scale = fov / (fov + z);
        
        return {
            x: this.centerX + x * scale,
            y: this.centerY + y * scale,
            scale: scale
        };
    }
    
    update() {
        this.rotation += this.config.rotationSpeed;
        this.pulsePhase += 0.02;
        
        this.particles.forEach(particle => {
            // Gentle floating motion
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.z += particle.vz;
            
            // Boundary check - return to original position gradually
            const distance = Math.sqrt(
                Math.pow(particle.x - particle.originalX, 2) +
                Math.pow(particle.y - particle.originalY, 2) +
                Math.pow(particle.z - particle.originalZ, 2)
            );
            
            if (distance > 30) {
                particle.vx *= -0.5;
                particle.vy *= -0.5;
                particle.vz *= -0.5;
            }
        });
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Create gradient background
        const gradient = this.ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, Math.max(this.width, this.height) / 2
        );
        gradient.addColorStop(0, 'rgba(26, 26, 26, 1)');
        gradient.addColorStop(1, 'rgba(45, 45, 45, 1)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Transform and sort particles by depth
        const transformedParticles = this.particles.map(particle => {
            const rotated = this.rotatePoint(
                particle.x, 
                particle.y, 
                particle.z,
                Math.sin(this.rotation * 0.5) * 0.3,
                this.rotation
            );
            const projected = this.projectPoint(rotated.x, rotated.y, rotated.z);
            
            return {
                ...particle,
                screenX: projected.x,
                screenY: projected.y,
                scale: projected.scale,
                z: rotated.z
            };
        }).sort((a, b) => a.z - b.z); // Draw far particles first
        
        // Draw connections with enhanced glow
        this.ctx.strokeStyle = this.config.lineColor;
        transformedParticles.forEach((p1, i) => {
            transformedParticles.slice(i + 1).forEach(p2 => {
                const dx = p1.screenX - p2.screenX;
                const dy = p1.screenY - p2.screenY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.config.maxDistance) {
                    const opacity = (1 - distance / this.config.maxDistance) * 0.6;
                    
                    // Pulse effect on connections
                    let finalOpacity = opacity;
                    if (this.config.pulseEffect) {
                        const pulseIntensity = Math.sin(this.pulsePhase + i * 0.1) * 0.3 + 0.7;
                        finalOpacity *= pulseIntensity;
                    }
                    
                    this.ctx.strokeStyle = this.config.lineColor + Math.floor(finalOpacity * 255).toString(16).padStart(2, '0');
                    this.ctx.lineWidth = 1 * Math.min(p1.scale, p2.scale);
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.screenX, p1.screenY);
                    this.ctx.lineTo(p2.screenX, p2.screenY);
                    this.ctx.stroke();
                }
            });
        });
        
        // Draw particles
        transformedParticles.forEach((particle, i) => {
            const size = particle.size * particle.scale;
            
            // Glow effect
            const glowIntensity = this.config.pulseEffect 
                ? Math.sin(this.pulsePhase + i * 0.1) * 0.5 + 0.5 
                : 1;
            
            // Outer glow
            const gradient = this.ctx.createRadialGradient(
                particle.screenX, particle.screenY, 0,
                particle.screenX, particle.screenY, size * 3
            );
            gradient.addColorStop(0, this.config.particleColor + 'CC');
            gradient.addColorStop(0.5, this.config.particleColor + '44');
            gradient.addColorStop(1, this.config.particleColor + '00');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(particle.screenX, particle.screenY, size * 3 * glowIntensity, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Core particle
            this.ctx.fillStyle = this.config.particleColor;
            this.ctx.beginPath();
            this.ctx.arc(particle.screenX, particle.screenY, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Bright center
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(particle.screenX, particle.screenY, size * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
        });
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

// Initialize all canvas elements when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Mobile nav toggle
    const navToggle = document.querySelector('.nav-toggle');
    const mobileMenu = document.getElementById('mobileMenu');
    if (navToggle && mobileMenu) {
        const closeMenu = () => {
            navToggle.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
            mobileMenu.classList.remove('open');
            document.body.classList.remove('menu-open');
        };

        navToggle.addEventListener('click', () => {
            const isOpen = navToggle.classList.toggle('active');
            navToggle.setAttribute('aria-expanded', String(isOpen));
            mobileMenu.classList.toggle('open', isOpen);
            document.body.classList.toggle('menu-open', isOpen);
        });

        // Close on link click
        mobileMenu.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => closeMenu());
        });

        // Close on resize to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 991) closeMenu();
        });
    }

    // Hero Section - AI Cyan (#00B3C7)
    const heroCanvas = new BrainNetwork('heroCanvas', {
        particleCount: 120,
        maxDistance: 130,
        particleColor: '#00B3C7',
        lineColor: '#00B3C7',
        particleSpeed: 0.15,
        rotationSpeed: 0.003,
        brainShape: true,
        pulseEffect: true
    });
    
    // Story Section - Lime Glow (#B7F171)
    const storyCanvas = new BrainNetwork('storyCanvas', {
        particleCount: 110,
        maxDistance: 125,
        particleColor: '#B7F171',
        lineColor: '#B7F171',
        particleSpeed: 0.18,
        rotationSpeed: 0.0025,
        brainShape: true,
        pulseEffect: true
    });
    
    // Technology Section - Deep Indigo (#6B6BFF)
    const techCanvas = new BrainNetwork('techCanvas', {
        particleCount: 115,
        maxDistance: 128,
        particleColor: '#6B6BFF',
        lineColor: '#6B6BFF',
        particleSpeed: 0.16,
        rotationSpeed: 0.0032,
        brainShape: true,
        pulseEffect: true
    });
    
    // Impact Section - Signal Orange (#FF8C42)
    const impactCanvas = new BrainNetwork('impactCanvas', {
        particleCount: 112,
        maxDistance: 127,
        particleColor: '#FF8C42',
        lineColor: '#FF8C42',
        particleSpeed: 0.17,
        rotationSpeed: 0.0028,
        brainShape: true,
        pulseEffect: true
    });
    
    // Smooth scroll behavior
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all sections
    document.querySelectorAll('section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(section);
    });
});

// Handle visibility change to pause/resume animations
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden - animations continue');
    } else {
        console.log('Page visible - animations active');
    }
});

// ========== Technology Process List Interaction ==========
document.addEventListener('DOMContentLoaded', () => {
    const techSteps = document.querySelectorAll('.tech-step');
    const techImages = document.querySelectorAll('.tech-image');
    
    let currentStep = 1;
    let autoPlayInterval;
    let userInteracted = false;
    const totalSteps = techSteps.length;
    
    // Preload all images
    techImages.forEach(img => {
        if (img.complete) {
            img.setAttribute('data-loaded', 'true');
        } else {
            img.addEventListener('load', () => {
                img.setAttribute('data-loaded', 'true');
            });
        }
    });
    
    // Function to show specific step
    function showStep(stepNumber) {
        // Remove active class from all steps and images
        techSteps.forEach(s => s.classList.remove('active'));
        techImages.forEach(img => img.classList.remove('active'));
        
        // Add active class to specified step and corresponding image
        const targetStep = document.querySelector(`.tech-step[data-step="${stepNumber}"]`);
        const targetImage = document.querySelector(`.tech-image[data-step="${stepNumber}"]`);
        
        if (targetStep) targetStep.classList.add('active');
        if (targetImage) targetImage.classList.add('active');
        
        currentStep = stepNumber;
    }
    
    // Function to go to next step
    function nextStep() {
        currentStep = currentStep >= totalSteps ? 1 : currentStep + 1;
        showStep(currentStep);
    }
    
    // Function to start auto-play
    function startAutoPlay(delay = 5000) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = setInterval(nextStep, delay);
    }
    
    // Function to stop auto-play
    function stopAutoPlay() {
        clearInterval(autoPlayInterval);
    }
    
    // Click handler for steps
    techSteps.forEach(step => {
        step.addEventListener('click', () => {
            const stepNumber = parseInt(step.getAttribute('data-step'));
            
            // Show clicked step immediately
            showStep(stepNumber);
            
            // Mark user interaction and restart auto-play with 10s delay
            userInteracted = true;
            stopAutoPlay();
            startAutoPlay(10000);
        });
        
        // Optional: Add hover effect
        step.addEventListener('mouseenter', () => {
            const stepNumber = step.getAttribute('data-step');
            const hoverImage = document.querySelector(`.tech-image[data-step="${stepNumber}"]`);
            
            // Preload image on hover if not already loaded
            if (hoverImage && !hoverImage.hasAttribute('data-loaded')) {
                hoverImage.setAttribute('data-loaded', 'true');
            }
        });
    });
    
    // Start auto-play initially (5 seconds)
    startAutoPlay(5000);
});

// ========== Feedback Section Interactive Effects ==========
document.addEventListener('DOMContentLoaded', () => {
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    
    // Card hover effects with parallax
    testimonialCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
        
        // Parallax effect on mouse move
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            card.style.transform = `translateY(-8px) scale(1.02) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1) rotateX(0deg) rotateY(0deg)';
        });
    });
    
    // Intersection Observer for testimonial animations
    const testimonialObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const delay = card.getAttribute('data-delay') || 0;
                
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, parseInt(delay));
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    // Observe all testimonial cards
    testimonialCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        testimonialObserver.observe(card);
    });
    
    // Auto-rotate testimonials (optional)
    let currentTestimonial = 0;
    const visibleCards = Array.from(testimonialCards).filter(card => 
        card.style.display !== 'none'
    );
    
    function highlightTestimonial() {
        // Remove highlight from all cards
        testimonialCards.forEach(card => {
            card.classList.remove('highlighted');
        });
        
        // Add highlight to current card
        if (visibleCards[currentTestimonial]) {
            visibleCards[currentTestimonial].classList.add('highlighted');
        }
        
        // Move to next card
        currentTestimonial = (currentTestimonial + 1) % visibleCards.length;
    }
    
    // Start auto-highlight every 4 seconds
    setInterval(highlightTestimonial, 4000);
    
    
    // Add CSS for highlighted state
    const style = document.createElement('style');
    style.textContent = `
        .testimonial-card.highlighted {
            border-color: var(--primary);
            box-shadow: 0 8px 30px rgba(0, 179, 199, 0.2);
            transform: translateY(-4px) scale(1.01);
        }
        
        .testimonial-card.highlighted::before {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
});

