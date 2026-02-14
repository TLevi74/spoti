// Scroll Animation Handler
document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '200px 0px 200px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Different animation styles for different elements
                const element = entry.target;
                const animationTypes = [
                    'scroll-fade',
                    'scroll-slide-up',
                    'scroll-slide-left',
                    'scroll-slide-right',
                    'scroll-scale',
                    'scroll-rotate'
                ];

                // Stagger animations
                const animationType = animationTypes[index % animationTypes.length];
                setTimeout(() => {
                    element.classList.add(animationType);
                }, index * 80);

                // Stop observing after animation
                observer.unobserve(element);
            }
        });
    }, observerOptions);

    // Observe all major elements
    const elementsToAnimate = document.querySelectorAll(
        'h2, ' +
        '#topSongsList li, ' +
        '.chart-container, ' +
        '.stat-cards-grid > div, ' +
        '#topArtists > div, ' +
        '#listeningHabits > div, ' +
        '#overallStats > div, ' +
        '#yearlyStats > div, ' +
        '#funStats > div, ' +
        '.two-column-grid > div'
    );

    elementsToAnimate.forEach((element, index) => {
        // Check if element is already visible on initial load
        const rect = element.getBoundingClientRect();
        const isInitiallyVisible = rect.top < window.innerHeight && rect.bottom > 0;
        
        if (isInitiallyVisible) {
            // Element is already visible, apply animation immediately
            const animationTypes = [
                'scroll-fade',
                'scroll-slide-up',
                'scroll-slide-left',
                'scroll-slide-right',
                'scroll-scale',
                'scroll-rotate'
            ];
            const animationType = animationTypes[index % animationTypes.length];
            setTimeout(() => {
                element.classList.add(animationType);
            }, index * 80);
        } else {
            // Element is not visible, use intersection observer
            observer.observe(element);
        }
    });

    // Parallax scroll effect for header
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            const scrollPosition = window.pageYOffset;
            header.style.backgroundPosition = `0px ${scrollPosition * 0.5}px`;
        });
    }

    // Enhanced parallax scroll effect for background shapes with scaling and dynamic creation
    const backgroundShapes = document.querySelector('.background-shapes');
    let dynamicShapes = [];
    let lastScrollY = 0;
    let shapeCounter = 6; // Start after existing 6 shapes
    
    window.addEventListener('scroll', () => {
        const scrollPosition = window.pageYOffset;
        const scrollProgress = scrollPosition / (document.documentElement.scrollHeight - window.innerHeight);
        
        // Animate ALL existing shapes
        const allShapes = document.querySelectorAll('.shape');
        allShapes.forEach((shape, index) => {
            // Each shape moves OUT OF SCREEN at different speeds
            const speed = 0.5 + (index * 0.2); // Much faster movement
            const yPos = -(scrollPosition * speed);
            
            // Strong horizontal movement to push shapes off screen
            const xDirection = index % 2 === 0 ? 1 : -1; // Alternate left/right
            const xPos = (scrollPosition * 0.3 * xDirection) + Math.sin(scrollPosition * 0.002 + index) * 50;
            
            // Scale WAY BIGGER as you scroll
            const baseScale = 1 + (scrollProgress * 4); // Grows up to 5x
            const scaleVariation = Math.sin(scrollPosition * 0.001 + index) * 0.3;
            const finalScale = baseScale + scaleVariation;
            
            // Update CSS variables that are used in animations
            shape.style.setProperty('--scroll-x', `${xPos}px`);
            shape.style.setProperty('--scroll-y', `${yPos}px`);
            shape.style.setProperty('--scroll-scale', finalScale);
        });
        
        // Create new shapes dynamically ONLY when closer to the end (60%+ scrolled)
        if (scrollPosition > lastScrollY && scrollProgress > 0.6) {
            const maxHeight = document.documentElement.scrollHeight - window.innerHeight;
            // Create a new shape every 400px of scroll in the last 40% of the page
            if (scrollPosition % 400 < 10 && dynamicShapes.length < 20) {
                createDynamicShape(shapeCounter);
                shapeCounter++;
            }
        }
        
        lastScrollY = scrollPosition;
    });

    function createDynamicShape(id) {
        const shape = document.createElement('div');
        shape.className = `shape dynamic-shape-${id}`;
        
        // Random position
        const side = Math.random() > 0.5 ? 'left' : 'right';
        const topPos = Math.random() * 100;
        
        // Random shape type
        const shapeTypes = [
            { bg: 'radial-gradient(circle, rgba(29, 185, 84, 0.7) 0%, rgba(29, 185, 84, 0.4) 50%, transparent 70%)', borderRadius: '50%', border: '2px solid rgba(29, 185, 84, 0.9)' },
            { bg: 'radial-gradient(circle, rgba(191, 90, 242, 0.7) 0%, rgba(191, 90, 242, 0.4) 50%, transparent 70%)', borderRadius: '50%', border: '3px solid rgba(191, 90, 242, 0.8)' },
            { bg: 'linear-gradient(135deg, rgba(29, 160, 242, 0.75) 0%, rgba(29, 185, 84, 0.6) 100%)', borderRadius: '20%', border: '2px dashed rgba(29, 160, 242, 0.8)' },
            { bg: 'linear-gradient(45deg, rgba(255, 140, 66, 0.7), rgba(225, 29, 99, 0.6))', borderRadius: '30%', border: 'none' },
            { bg: 'rgba(225, 29, 99, 0.65)', clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)', border: 'none' }
        ];
        
        const randomType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
        const size = 100 + Math.random() * 150;
        
        shape.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            background: ${randomType.bg};
            border-radius: ${randomType.borderRadius || '0'};
            border: ${randomType.border};
            ${randomType.clipPath ? `clip-path: ${randomType.clipPath};` : ''}
            ${side}: ${5 + Math.random() * 15}%;
            top: ${topPos}%;
            opacity: 0;
            animation: float-slow ${6 + Math.random() * 4}s ease-in-out infinite;
            transition: opacity 1s ease-in;
            --scroll-x: 0px;
            --scroll-y: 0px;
            --scroll-scale: 1;
        `;
        
        backgroundShapes.appendChild(shape);
        dynamicShapes.push(shape);
        
        // Fade in the new shape
        setTimeout(() => {
            shape.style.opacity = '1';
        }, 100);
    }

    // Add glow effect on scroll
    const glowElements = document.querySelectorAll(
        'h1, h2, .chart-container, ' +
        '.stat-cards-grid > div, ' +
        '#topArtists > div, ' +
        '#funStats > div'
    );

    window.addEventListener('scroll', () => {
        glowElements.forEach((element) => {
            const rect = element.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            
            if (isVisible) {
                const scrollPercent = (window.innerHeight - rect.top) / window.innerHeight;
                const intensity = Math.max(0, Math.min(1, scrollPercent * 1.5));
                element.style.boxShadow = `0 0 ${20 * intensity}px rgba(29, 185, 84, ${0.3 * intensity})`;
            }
        });
    });

    // Smooth number counting animation for stats
    const observerStats = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const text = element.querySelector('[style*="font-weight: bold"]');
                
                if (text && !isNaN(parseInt(text.textContent))) {
                    animateCounter(text);
                    observerStats.unobserve(element);
                }
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-cards-grid > div, #overallStats > div').forEach((element) => {
        observerStats.observe(element);
    });

    function animateCounter(element) {
        const finalValue = parseInt(element.textContent);
        const startValue = 0;
        const duration = 1000; // 1 second
        const startTime = Date.now();

        function update() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(startValue + (finalValue - startValue) * progress);
            element.textContent = current.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = finalValue.toLocaleString();
            }
        }

        update();
    }

    // Floating animation on hover for stat cards
    document.querySelectorAll('.stat-cards-grid > div, #topArtists > div, #funStats > div').forEach((card) => {
        card.addEventListener('mouseenter', () => {
            card.style.animation = 'float 0.6s ease-in-out';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.animation = 'none';
        });
    });

    // Add scroll progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress-bar';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        background: linear-gradient(90deg, #1DB954, #1ed760);
        box-shadow: 0 0 10px rgba(29, 185, 84, 0.6);
        z-index: 9999;
        transition: width 0.1s ease-out;
    `;
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = (window.pageYOffset / scrollHeight) * 100;
        progressBar.style.width = scrolled + '%';
    });

    // Add particle effect on stat card click
    document.querySelectorAll('.stat-cards-grid > div, #topArtists > div, #funStats > div').forEach((card) => {
        card.addEventListener('click', (e) => {
            createRipple(e, card);
        });
    });

    function createRipple(event, element) {
        const rect = element.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: rgba(29, 185, 84, 0.6);
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
            animation: rippleAnimation 0.6s ease-out;
        `;

        if (element.style.position === 'static') {
            element.style.position = 'relative';
        }

        element.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }

    // Add ripple animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes rippleAnimation {
            from {
                opacity: 1;
                transform: scale(0);
            }
            to {
                opacity: 0;
                transform: scale(1);
            }
        }
    `;
    document.head.appendChild(style);

    // Animate random facts background lines on scroll
    const randomFactsLines = document.querySelector('.random-facts-lines');
    const funStatsSection = document.querySelector('#funStats');
    
    if (randomFactsLines && funStatsSection) {
        const lines = randomFactsLines.querySelectorAll('.random-line');
        
        // Observer to show/hide lines when Fun Stats section is in view
        const linesObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    randomFactsLines.classList.add('active');
                } else {
                    randomFactsLines.classList.remove('active');
                }
            });
        }, { threshold: 0.05, rootMargin: '400px' });
        
        linesObserver.observe(funStatsSection);
        
        // Scroll animation for lines
        let ticking = false;
        
        function updateLines() {
            const scrollPosition = window.pageYOffset;
            const funStatsRect = funStatsSection.getBoundingClientRect();
            const funStatsTop = funStatsRect.top + scrollPosition;
            const viewportHeight = window.innerHeight;
            
            // Calculate relative scroll position to Fun Stats section
            const relativeScroll = scrollPosition - funStatsTop + viewportHeight;
            const scrollProgress = relativeScroll / (viewportHeight + funStatsRect.height);
            
            lines.forEach((line, index) => {
                // Each line moves at different speed and direction
                const speed = 0.3 + (index * 0.15);
                const direction = index % 2 === 0 ? 1 : -1;
                
                // Horizontal movement based on scroll
                const translateX = (scrollProgress * 100 * speed * direction);
                
                // Rotation based on scroll
                const baseRotation = [(-5), 15, 3, (-20), 8, (-12)][index];
                const rotationChange = (scrollProgress * 30 * direction);
                const rotation = baseRotation + rotationChange;
                
                // Opacity fluctuation
                const opacity = 0.4 + Math.sin(scrollProgress * Math.PI * 2 + index) * 0.3;
                
                // Scale pulsing effect
                const scale = 1 + Math.sin(scrollProgress * Math.PI * 4 + index * 0.5) * 0.1;
                
                line.style.transform = `translateX(${translateX}%) rotate(${rotation}deg) scale(${scale})`;
                line.style.opacity = opacity;
            });
            
            ticking = false;
        }
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    updateLines();
                });
                ticking = true;
            }
        });
        
        // Initial update
        updateLines();
    }
});
