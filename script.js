/**
 * Age Calculator - Premium Logic
 * Handles date mathematics, live updates, and theme persistence.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Shared Theme Toggle Logic (runs on all pages safely)
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    const savedTheme = localStorage.getItem('theme') || 'dark-theme';
    body.className = savedTheme;

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (body.classList.contains('dark-theme')) {
                body.className = 'light-theme';
                localStorage.setItem('theme', 'light-theme');
            } else {
                body.className = 'dark-theme';
                localStorage.setItem('theme', 'dark-theme');
            }
        });
    }

    // Index-page Specific Elements
    const calculateBtn = document.getElementById('calculate-btn');
    const errorMsg = document.getElementById('error-msg');
    const resultSection = document.getElementById('result-section');
    const dobDay = document.getElementById('dob-day');
    const dobMonth = document.getElementById('dob-month');
    const dobYear = document.getElementById('dob-year');
    const setTodayBtn = document.getElementById('set-today-btn');

    // Only run age calculator logic if elements exist (prevents crashes on other pages)
    if (calculateBtn && dobDay && dobMonth && dobYear) {
        let updateInterval = null;

        // --- Helper: Format large numbers (millions conversion) ---
        function formatValue(num) {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(2) + " Million";
            }
            return num.toLocaleString();
        }

        // --- Helper: Date Validator ---
        function isValidDate(year, month, day) {
            const y = parseInt(year, 10);
            const m = parseInt(month, 10);
            const d = parseInt(day, 10);
            const testDate = new Date(y, m, d);
            return testDate.getFullYear() === y && testDate.getMonth() === m && testDate.getDate() === d;
        }

        // --- Helper: Dynamic Month Length Adder ---
        function addMonths(date, value) {
            const d = new Date(date.getTime());
            const desiredMonth = d.getMonth() + value;
            d.setMonth(desiredMonth);
            // Handle day overflow roll-overs (e.g. Jan 31 + 1 month = March 3)
            if (d.getMonth() !== desiredMonth % 12) {
                d.setDate(0); // Cap at the last day of the previous calendar month
            }
            return d;
        }

        // --- Populate DOB Select List ---
        function populateYears() {
            const currentYear = new Date().getFullYear();
            for (let i = currentYear; i >= 1900; i--) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                dobYear.appendChild(option);
            }
        }

        function populateDays(year, month) {
            const currentSelectedDay = dobDay.value;
            dobDay.innerHTML = '<option value="" disabled selected>Day</option>';
            
            let daysInMonth = 31; // Default to standard 31 days if no month is selected yet
            if (year && month !== "") {
                daysInMonth = new Date(year, parseInt(month, 10) + 1, 0).getDate();
            } else if (month !== "") {
                // Assume 2024 leap-year as fallback to allow maximum options
                daysInMonth = new Date(2024, parseInt(month, 10) + 1, 0).getDate();
            }
            
            for (let i = 1; i <= daysInMonth; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                dobDay.appendChild(option);
            }

            // Restore previously selected day if still within bounds
            if (currentSelectedDay && parseInt(currentSelectedDay, 10) <= daysInMonth) {
                dobDay.value = currentSelectedDay;
            }
        }

        // Initialize lists on start
        populateYears();
        populateDays("", ""); // Populate 31 days on startup so Day is selectable first

        // Event-Listeners for live dropdown prunings
        dobMonth.addEventListener('change', () => {
            populateDays(dobYear.value, dobMonth.value);
            hideError();
        });

        dobYear.addEventListener('change', () => {
            populateDays(dobYear.value, dobMonth.value);
            hideError();
        });

        dobDay.addEventListener('change', hideError);

        // Select Today Button Logic
        if (setTodayBtn) {
            setTodayBtn.addEventListener('click', () => {
                const today = new Date();
                dobYear.value = today.getFullYear();
                dobMonth.value = today.getMonth();
                populateDays(today.getFullYear(), today.getMonth());
                dobDay.value = today.getDate();
                hideError();
            });
        }

        // --- Core Date Mathematics (Accurate Gregorian Calculation) ---
        function calculateExactAge(birthDate) {
            const now = new Date();
            
            let years = now.getFullYear() - birthDate.getFullYear();
            let months = now.getMonth() - birthDate.getMonth();
            let days = now.getDate() - birthDate.getDate();
            let hours = now.getHours() - birthDate.getHours();
            let minutes = now.getMinutes() - birthDate.getMinutes();
            let seconds = now.getSeconds() - birthDate.getSeconds();

            // Sane Borrow seconds
            if (seconds < 0) {
                seconds += 60;
                minutes--;
            }
            // Sane Borrow minutes
            if (minutes < 0) {
                minutes += 60;
                hours--;
            }
            // Sane Borrow hours
            if (hours < 0) {
                hours += 24;
                days--;
            }
            // Sane Borrow calendar days using current calendar month limits
            if (days < 0) {
                const prevMonthDate = new Date(now.getFullYear(), now.getMonth(), 0);
                days += prevMonthDate.getDate();
                months--;
            }
            // Sane Borrow months
            if (months < 0) {
                months += 12;
                years--;
            }

            return { years, months, days, hours, minutes, seconds };
        }

        // Calculate Total Cumulative Statistics
        function calculateStats(birthDate) {
            const now = new Date();
            const diffMs = now.getTime() - birthDate.getTime();
            
            const seconds = Math.floor(diffMs / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            const weeks = Math.floor(days / 7);

            // Accurate elapsed months
            let totalMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());
            if (now.getDate() < birthDate.getDate()) {
                totalMonths--;
            }

            return { totalMonths, weeks, days, hours, minutes, seconds };
        }

        // Calculate Clean Next Birthday Countdown (using real month intervals)
        function calculateNextBirthday(birthDate) {
            const now = new Date();
            let nextBday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
            
            // If birthday is Feb 29 and not a leap year, snap to Feb 28
            if (birthDate.getMonth() === 1 && birthDate.getDate() === 29) {
                const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
                if (!isLeap(nextBday.getFullYear())) {
                    nextBday = new Date(nextBday.getFullYear(), 1, 28);
                }
            }

            // If birthday passed this year, increment to next year
            if (now > nextBday) {
                nextBday = new Date(now.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
                if (birthDate.getMonth() === 1 && birthDate.getDate() === 29) {
                    const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
                    if (!isLeap(nextBday.getFullYear())) {
                        nextBday = new Date(nextBday.getFullYear(), 1, 28);
                    }
                }
            }

            let tempDate = new Date(now.getTime());
            let months = 0;

            // Increment count of full months in countdown
            while (true) {
                let nextMonth = addMonths(now, months + 1);
                if (nextMonth <= nextBday) {
                    tempDate = nextMonth;
                    months++;
                } else {
                    break;
                }
            }

            // Exact residual difference
            const remainingDiff = nextBday.getTime() - tempDate.getTime();
            const seconds = Math.floor((remainingDiff / 1000) % 60);
            const minutes = Math.floor((remainingDiff / (1000 * 60)) % 60);
            const hours = Math.floor((remainingDiff / (1000 * 60 * 60)) % 24);
            const days = Math.floor(remainingDiff / (1000 * 60 * 60 * 24));

            return { months, days, hours, minutes, seconds };
        }

        // --- Render live update tick ---
        function updateLiveResults(birthDate) {
            const now = new Date();
            const age = calculateExactAge(birthDate);
            const stats = calculateStats(birthDate);
            const nextBday = calculateNextBirthday(birthDate);

            // Individual cards
            document.getElementById('res-years').textContent = age.years;
            document.getElementById('res-months').textContent = age.months;
            document.getElementById('res-days').textContent = age.days;
            document.getElementById('res-hours').textContent = String(age.hours).padStart(2, '0');
            document.getElementById('res-minutes').textContent = String(age.minutes).padStart(2, '0');
            document.getElementById('res-seconds').textContent = String(age.seconds).padStart(2, '0');

            // Cumulative Statistics
            document.getElementById('total-months').textContent = formatValue(stats.totalMonths);
            document.getElementById('total-weeks').textContent = formatValue(stats.weeks);
            document.getElementById('total-days').textContent = formatValue(stats.days);
            document.getElementById('total-hours').textContent = formatValue(stats.hours);
            document.getElementById('total-minutes').textContent = formatValue(stats.minutes);
            document.getElementById('total-seconds').textContent = formatValue(stats.seconds);

            // Next Birthday Remaining
            document.getElementById('cd-months').textContent = String(nextBday.months).padStart(2, '0');
            document.getElementById('cd-days').textContent = String(nextBday.days).padStart(2, '0');
            document.getElementById('cd-hours').textContent = String(nextBday.hours).padStart(2, '0');
            document.getElementById('cd-mins').textContent = String(nextBday.minutes).padStart(2, '0');
            document.getElementById('cd-secs').textContent = String(nextBday.seconds).padStart(2, '0');

            // Fun health facts
            const avgHeartRate = 72; // Avg bpm
            const avgBreathRate = 14; // Avg breaths per minute
            const avgSleep = 8; // Avg sleep hours per day

            const totalMinutes = stats.minutes;
            const totalDays = stats.days;

            document.getElementById('fact-heart').textContent = formatValue(Math.floor(totalMinutes * avgHeartRate));
            document.getElementById('fact-breaths').textContent = formatValue(Math.floor(totalMinutes * avgBreathRate));
            document.getElementById('fact-sleep').textContent = formatValue(Math.floor(totalDays * avgSleep));

            // Born Day Name
            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            document.getElementById('birth-day-name').textContent = daysOfWeek[birthDate.getDay()];


        }

        // --- Calculation trigger ---
        function runCalculation() {
            const year = dobYear.value;
            const month = dobMonth.value;
            const day = dobDay.value;

            if (!year || !month || !day) {
                showError("Please select your complete date of birth.");
                return;
            }

            if (!isValidDate(year, month, day)) {
                showError("Please select a valid calendar date of birth.");
                return;
            }

            const birthDate = new Date(parseInt(year, 10), parseInt(month, 10), parseInt(day, 10));
            const now = new Date();

            if (birthDate > now) {
                showError("The date of birth cannot be in the future.");
                return;
            }

            hideError();

            // Smoothly reveal results
            resultSection.classList.remove('hidden');
            resultSection.style.display = 'block';
            setTimeout(() => {
                resultSection.style.opacity = '1';
                resultSection.style.transform = 'translateY(0)';
            }, 10);

            // Periodical Update setup
            if (updateInterval) clearInterval(updateInterval);

            updateLiveResults(birthDate);
            updateInterval = setInterval(() => {
                updateLiveResults(birthDate);
            }, 1000);

            // Scroll to the results block
            window.scrollTo({
                top: resultSection.offsetTop - 100,
                behavior: 'smooth'
            });
        }

        function showError(msg) {
            errorMsg.textContent = msg;
            errorMsg.style.opacity = '1';
        }

        function hideError() {
            errorMsg.style.opacity = '0';
        }

        calculateBtn.addEventListener('click', runCalculation);
        
        // Setup Enter key submission listeners
        [dobDay, dobMonth, dobYear].forEach(el => {
            el.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') runCalculation();
            });
        });
    }

    // --- Dynamic Modal Generation & Handling for Leap Year Checker (Global) ---
    function initLeapYearModal() {
        // Create the modal overlay container
        const modal = document.createElement('div');
        modal.id = 'leap-year-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content glass">
                <button id="close-leap-btn" class="modal-close-btn" aria-label="Close Modal">&times;</button>
                <h2 class="modal-title">
                    <svg class="modal-title-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span class="gradient-text">Leap Year Checker</span>
                </h2>
                <p class="modal-desc">
                    The Gregorian calendar repeats every 400 years to align precisely with Earth's orbit. Enter any year below to instantly determine if it features a leap day or is a standard 365-day year.
                </p>
                <div class="input-group-modal">
                    <label for="leap-year-input">Select Calendar Year</label>
                    <select id="leap-year-input" class="glass-select animate-fade" style="text-align-last: left; text-align: left; width: 100%; border-radius: 12px; font-weight: 500;" aria-label="Select Year border">
                        <option value="" disabled>Select Year</option>
                    </select>
                </div>
                <div class="input-footer-modal">
                    <button type="button" id="clear-leap-btn" class="secondary-btn">Clear</button>
                    <button id="check-leap-btn" class="glow-button">Check Year</button>
                </div>
                <div id="leap-result-container" class="hidden">
                    <p id="leap-result-title"></p>
                    <p id="leap-result-desc"></p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Populate standard years list from 2200 down to 1800 with current year pre-selected
        const leapYearInput = document.getElementById('leap-year-input');
        if (leapYearInput) {
            const currentYear = new Date().getFullYear();
            for (let y = 2200; y >= 1800; y--) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                if (y === currentYear) {
                    opt.selected = true;
                }
                leapYearInput.appendChild(opt);
            }
        }

        // Bind triggers globally (any element with class .leap-year-trigger)
        const triggers = document.querySelectorAll('.leap-year-trigger');
        triggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                modal.classList.add('active');
                setTimeout(() => {
                    document.getElementById('leap-year-input').focus();
                }, 50);
            });
        });

        // Close logic
        const closeBtn = document.getElementById('close-leap-btn');
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });

        // Keypress logic to close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                modal.classList.remove('active');
            }
        });

        // Action Buttons within Modal
        const checkLeapBtn = document.getElementById('check-leap-btn');
        const clearLeapBtn = document.getElementById('clear-leap-btn');
        const leapResultContainer = document.getElementById('leap-result-container');
        const leapResultTitle = document.getElementById('leap-result-title');
        const leapResultDesc = document.getElementById('leap-result-desc');

        function checkLeapYear() {
            const yearVal = leapYearInput.value.trim();
            if (!yearVal) {
                showLeapResult("Please enter a year", "Enter a positive numeric reference to calculate leap status.", false);
                return;
            }

            const year = parseInt(yearVal, 10);
            if (isNaN(year) || year < 1) {
                showLeapResult("Invalid Year", "Please enter a valid positive calendar year (e.g., 2024).", false);
                return;
            }

            const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
            if (isLeap) {
                const desc = `${year} matches the modern Gregorian leap criteria: divisible by 4, and since it is not divisible by 100 (or is divisible by 400), it includes a leap day (February 29), resulting in 366 total calendar days.`;
                showLeapResult(`✨ ${year} is a Leap Year!`, desc, true);
            } else {
                let transitionReason = "";
                if (year % 4 !== 0) {
                    transitionReason = "it is not divisible by 4";
                } else if (year % 100 === 0 && year % 400 !== 0) {
                    transitionReason = "it is divisible by 100 but not by 400 (Gregorian exception exception rule)";
                }
                const desc = `${year} is a standard calendar year of 365 days because ${transitionReason}. It does not contain a leap day in February.`;
                showLeapResult(`❌ ${year} is a Standard Year`, desc, false);
            }
        }

        function showLeapResult(title, desc, isLeapSuccess) {
            leapResultContainer.classList.remove('hidden');
            leapResultContainer.style.display = 'block';
            leapResultTitle.textContent = title;
            leapResultDesc.textContent = desc;

            if (isLeapSuccess) {
                leapResultTitle.style.color = 'var(--accent-cyan)';
                leapResultContainer.style.borderColor = 'var(--accent-cyan)';
            } else {
                leapResultTitle.style.color = 'var(--text-primary)';
                leapResultContainer.style.borderColor = 'var(--border-color)';
            }
        }

        function clearLeapChecker() {
            leapYearInput.value = "";
            leapResultContainer.classList.add('hidden');
            leapResultContainer.style.display = 'none';
            leapResultTitle.textContent = "";
            leapResultDesc.textContent = "";
        }

        checkLeapBtn.addEventListener('click', checkLeapYear);
        clearLeapBtn.addEventListener('click', clearLeapChecker);
        leapYearInput.addEventListener('change', checkLeapYear);
    }

    // Initialize leap year modal globally
    initLeapYearModal();

    // --- Standalone Contact Form AJAX Submission (Formspree) (Global) ---
    const contactForm = document.getElementById('contact-form');
    const contactSubmitBtn = document.getElementById('contact-submit');
    const formFeedback = document.getElementById('form-feedback');

    if (contactForm && contactSubmitBtn && formFeedback) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Clear previous message
            formFeedback.style.display = 'none';
            formFeedback.textContent = '';
            formFeedback.style.color = 'var(--text-primary)';

            // Disable submit button and change text
            contactSubmitBtn.disabled = true;
            const originalBtnText = contactSubmitBtn.textContent;
            contactSubmitBtn.textContent = 'Transmitting Message...';

            const data = new FormData(contactForm);

            try {
                const response = await fetch(contactForm.action, {
                    method: contactForm.method,
                    body: data,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    formFeedback.style.display = 'block';
                    formFeedback.style.color = 'var(--accent-cyan)';
                    formFeedback.textContent = '🚀 Message transmitted successfully! Our team will receive it and reply soon.';
                    contactForm.reset();
                } else {
                    const responseData = await response.json();
                    if (responseData && responseData.error) {
                        throw new Error(responseData.error);
                    } else if (responseData && responseData.errors && responseData.errors.length > 0) {
                        throw new Error(responseData.errors.map(err => err.message).join(', '));
                    } else {
                        throw new Error('An error occurred. Please try again later.');
                    }
                }
            } catch (error) {
                formFeedback.style.display = 'block';
                formFeedback.style.color = '#ef4444';
                formFeedback.textContent = `❌ ${error.message || 'Transmission failed. Please verify your connection and try again.'}`;
            } finally {
                contactSubmitBtn.disabled = false;
                contactSubmitBtn.textContent = originalBtnText;
            }
        });
    }

    // --- Dynamic Navigation Hamburger & Sliding Drawer Implementation ---
    function initNavigationDrawer() {
        const navContent = document.querySelector('.nav-content');
        const themeToggleBtn = document.getElementById('theme-toggle');

        if (navContent && themeToggleBtn) {
            // 1. Create actions wrapper (theme button + hamburger)
            const actionsWrapper = document.createElement('div');
            actionsWrapper.className = 'nav-actions-wrapper';
            actionsWrapper.style.display = 'flex';
            actionsWrapper.style.alignItems = 'center';
            actionsWrapper.style.gap = '1rem';

            // Insert wrapper before theme toggle button
            themeToggleBtn.parentNode.insertBefore(actionsWrapper, themeToggleBtn);
            // Append theme toggle and a new hamburger button into wrapper
            actionsWrapper.appendChild(themeToggleBtn);

            // Create Hamburger button
            const hamburgerBtn = document.createElement('button');
            hamburgerBtn.id = 'hamburger-btn';
            hamburgerBtn.className = 'hamburger-btn';
            hamburgerBtn.setAttribute('aria-label', 'Toggle Navigation Menu');
            hamburgerBtn.innerHTML = `
                <span></span>
                <span></span>
                <span></span>
            `;
            actionsWrapper.appendChild(hamburgerBtn);

            // 2. Clone the existing menu links to load inside the drawer
            const originalNavLinks = document.querySelector('.nav-links');
            let linksHtml = '';
            if (originalNavLinks) {
                // Read original navigation markup
                linksHtml = originalNavLinks.innerHTML;
            } else {
                // Safe fallback in case navbar is structured differently
                linksHtml = `
                    <a href="./index.html">Home</a>
                    <a href="#" class="leap-year-trigger">Leap Year</a>
                    <a href="./about.html">About</a>
                    <a href="./contact.html">Contact</a>
                    <a href="./privacy-policy.html">Privacy Policy</a>
                    <a href="./terms.html">Terms</a>
                `;
            }

            // Create drawer element
            const drawerOverlay = document.createElement('div');
            drawerOverlay.id = 'nav-drawer-overlay';
            drawerOverlay.className = 'drawer-overlay';
            drawerOverlay.innerHTML = `
                <div class="drawer-container glass">
                    <button id="close-drawer-btn" class="drawer-close-btn" aria-label="Close Menu">&times;</button>
                    <div class="drawer-header">
                        <span class="logo">MORE INFORMATION</span>
                    </div>
                    <div class="drawer-links-container">
                        ${linksHtml}
                    </div>
                    <div class="drawer-footer">
                        <p>&copy; 2026 Age Calculator</p>
                        <span>Jamshaid</span>
                    </div>
                </div>
            `;
            document.body.appendChild(drawerOverlay);

            // 3. Register drawer action events
            hamburgerBtn.addEventListener('click', () => {
                const isOpen = drawerOverlay.classList.toggle('active');
                hamburgerBtn.classList.toggle('open', isOpen);
            });

            const closeDrawerBtn = document.getElementById('close-drawer-btn');
            if (closeDrawerBtn) {
                closeDrawerBtn.addEventListener('click', () => {
                    drawerOverlay.classList.remove('active');
                    hamburgerBtn.classList.remove('open');
                });
            }

            drawerOverlay.addEventListener('click', (e) => {
                if (e.target === drawerOverlay) {
                    drawerOverlay.classList.remove('active');
                    hamburgerBtn.classList.remove('open');
                }
            });

            // Close with ESC key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && drawerOverlay.classList.contains('active')) {
                    drawerOverlay.classList.remove('active');
                    hamburgerBtn.classList.remove('open');
                }
            });

            // Rebind local Leap Year event triggers inside drawer
            const drawerLeapTriggers = drawerOverlay.querySelectorAll('.leap-year-trigger');
            drawerLeapTriggers.forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    drawerOverlay.classList.remove('active');
                    hamburgerBtn.classList.remove('open');
                    
                    // Open the leap year modal
                    const leapModal = document.getElementById('leap-year-modal');
                    if (leapModal) {
                        leapModal.classList.add('active');
                        setTimeout(() => {
                            const input = document.getElementById('leap-year-input');
                            if (input) input.focus();
                        }, 50);
                    }
                });
            });

            // Auto close drawer when anchor link (like #seo-guide) is clicked
            const drawerLinks = drawerOverlay.querySelectorAll('.drawer-links-container a');
            drawerLinks.forEach(link => {
                link.addEventListener('click', () => {
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('#')) {
                        drawerOverlay.classList.remove('active');
                        hamburgerBtn.classList.remove('open');
                    }
                });
            });
        }
    }

    // --- SEO Collapsible Toggle Feature ---
    function initSeoCollapsible() {
        const toggleBtn = document.getElementById('seo-toggle-btn');
        const collapsible = document.getElementById('seo-collapsible');
        if (toggleBtn && collapsible) {
            toggleBtn.addEventListener('click', () => {
                const isExpanded = collapsible.classList.contains('expanded');
                if (isExpanded) {
                    collapsible.classList.remove('expanded');
                    collapsible.style.maxHeight = '0px';
                    collapsible.style.opacity = '0';
                    toggleBtn.querySelector('span').textContent = 'Read More';
                    toggleBtn.classList.remove('expanded');
                } else {
                    collapsible.classList.add('expanded');
                    collapsible.style.maxHeight = collapsible.scrollHeight + 'px';
                    collapsible.style.opacity = '1';
                    toggleBtn.querySelector('span').textContent = 'Read Less';
                    toggleBtn.classList.add('expanded');
                }
            });
        }
    }

    // Initialize Navigation Drawer and SEO collapsible guide
    initNavigationDrawer();
    initSeoCollapsible();
});
