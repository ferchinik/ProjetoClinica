// public/js/forms/utils.js

export function formatDateToDisplayApp(dateInput) {
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
        console.error("Erro ao formatar data em utils.js:", dateInput, e);
        return '--/--/----';
    }
}

export const formatCurrency = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return 'Gs. 0';
    return num.toLocaleString('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};