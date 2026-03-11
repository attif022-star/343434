document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Menu Toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');

    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = mobileBtn.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.replace('fa-bars', 'fa-times');
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
            }
        });
    }

    // 2. Animations on Scroll
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
    const fadeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 75);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.tool-card, .feature-box').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(25px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        fadeObserver.observe(el);
    });

    // 3. Backend Integration Logic
    const fileInput = document.getElementById('general-file-input');
    const loadingOverlay = document.getElementById('loading-overlay');
    let currentAction = null;

    const showLoading = () => loadingOverlay.style.display = 'flex';
    const hideLoading = () => loadingOverlay.style.display = 'none';

    // Helper function to handle downloads from Blob
    const downloadBlob = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Define base URL depending on environment
    const isLocalFile = window.location.protocol === 'file:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    // If we're on a deployed Vercel app or local server, we just use relative path '' so it appends /api/xyz correctly to current origin
    const baseUrl = isLocalFile ? 'http://localhost:3000' : '';

    // Generic upload handler
    const handleFileUpload = async (endpoint, formData, expectedFilename) => {
        showLoading();
        try {
            const response = await fetch(`${baseUrl}${endpoint}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Operation failed');
            }

            const blob = await response.blob();
            // Determine filename from header if possible, else use expected
            const disposition = response.headers.get('Content-Disposition');
            let filename = expectedFilename;
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                if (matches != null && matches[1]) { 
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            downloadBlob(blob, filename);

        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            hideLoading();
            fileInput.value = ''; // Reset input
        }
    };


    // Tools Mapping
    const toolCards = document.querySelectorAll('.tool-card');
    
    fileInput.addEventListener('change', (e) => {
        if (!e.target.files.length) return;
        
        const files = e.target.files;
        const formData = new FormData();

        switch (currentAction) {
            case 'Merge Files':
                if (files.length < 2) {
                    alert('Please select at least 2 PDF files to merge.');
                    return;
                }
                for (let i = 0; i < files.length; i++) {
                    formData.append('files', files[i]);
                }
                handleFileUpload('/api/merge-pdf', formData, 'merged.pdf');
                break;

            case 'Image Converter':
                formData.append('file', files[0]);
                formData.append('format', 'png'); // Fixed to png for testing, UI could be added to select this
                handleFileUpload('/api/image-convert', formData, 'converted.png');
                break;
            
            case 'Protect File':
                const password = prompt('Enter a password to encrypt this PDF:');
                if (!password) {
                    alert('Password is required to protect the file.');
                    return;
                }
                formData.append('file', files[0]);
                formData.append('password', password);
                handleFileUpload('/api/protect-pdf', formData, 'protected.pdf');
                break;
                
            case 'Extract ZIP':
                 formData.append('file', files[0]);
                 fetch(`${baseUrl}/api/extract-zip`, { method: 'POST', body: formData })
                    .then(res => res.json())
                    .then(data => alert(data.message + "\nFiles: " + data.files.join(', ')))
                    .catch(e => alert(e.message));
                 break;
                 
            case 'Word to PDF':
            case 'Excel to PDF': // Grouping format to PDF handlers
            case 'Format to Word':
            case 'Format to Excel':
            case 'Format to Powerpoint':
                 formData.append('file', files[0]);
                 formData.append('action', actionName);
                 handleFileUpload('/api/convert-format', formData, 'converted.pdf');
                 break;

            case 'Split Files':
                formData.append('file', files[0]);
                handleFileUpload('/api/split-pdf', formData, 'split-files.zip');
                break;

            case 'Compress Size':
                formData.append('file', files[0]);
                handleFileUpload('/api/compress-pdf', formData, 'compressed.pdf');
                break;

            case 'Unlock File':
                const unlockPass = prompt('Enter the password to unlock this PDF:');
                if (!unlockPass) {
                    alert('Password is required to unlock the file.');
                    return;
                }
                formData.append('file', files[0]);
                formData.append('password', unlockPass);
                handleFileUpload('/api/unlock-pdf', formData, 'unlocked.pdf');
                break;

            default:
                alert(`${currentAction} is not fully hooked up to backend yet!`);
                fileInput.value = '';
                break;
        }
    });

    toolCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const actionName = card.querySelector('h3').innerText;
            currentAction = actionName;

            // Define accepted types and multiple flag based on action
            if (actionName === 'Merge Files') {
                fileInput.accept = '.pdf';
                fileInput.multiple = true;
            } else if (actionName === 'Image Converter') {
                fileInput.accept = 'image/*';
                fileInput.multiple = false;
            } else if (actionName === 'Protect File' || actionName === 'Split Files' || actionName === 'Compress Size' || actionName === 'Unlock File') {
                fileInput.accept = '.pdf';
                fileInput.multiple = false;
            } else if (actionName === 'Extract ZIP') {
                fileInput.accept = '.zip';
                fileInput.multiple = false;
            } else if (actionName === 'Word to PDF') {
                fileInput.accept = '.doc,.docx';
                fileInput.multiple = false;
            } else {
                alert(`Backend for "${actionName}" is not ready in this demo version.`);
                return;
            }

            // Trigger file dialog
            fileInput.click();
        });
    });
});
