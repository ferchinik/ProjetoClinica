/**
 * Utility functions for formatting data
 */

/**
 * Formats a date for display in the application
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Formatted date string
 */
export function formatDateToDisplay(dateInput) {
    if (!dateInput) return '--/--/----';
    try {
        let dateObj;
        if (typeof dateInput === 'string') {
            dateObj = new Date(dateInput.includes('T') ? dateInput : dateInput + 'T00:00:00Z');
        } else if (dateInput instanceof Date) {
            dateObj = dateInput;
        } else {
            return '--/--/----';
        }
        if (isNaN(dateObj.getTime())) {
            if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
                const [year, month, day] = dateInput.split('-');
                return `${day}/${month}/${year}`;
            }
            return '--/--/----';
        }
        const day = String(dateObj.getUTCDate()).padStart(2, '0');
        const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const year = dateObj.getUTCFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("Erro ao formatar data:", dateInput, e);
        return '--/--/----';
    }
}

/**
 * Formats a currency value
 * @param {number|string} value - The value to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return 'Gs. 0';
    return num.toLocaleString('es-PY', { 
        style: 'currency', 
        currency: 'PYG', 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
    });
}

/**
 * Formats a phone number for WhatsApp
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} Formatted phone number
 */
export function formatPhoneNumberForWhatsApp(phoneNumber) {
    if (!phoneNumber) return '';
    
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if the number already has the country code
    if (!cleaned.startsWith('595')) {
        // If it starts with 0, remove it
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }
        
        // Add Paraguay country code
        cleaned = '595' + cleaned;
    }
    
    return cleaned;
}
