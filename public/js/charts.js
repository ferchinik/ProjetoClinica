document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeCharts, 1000);
});

function initializeCharts() {
    if (document.getElementById('revenueChart') && document.getElementById('proceduresChart')) {
        createRevenueChart();
        createProceduresChart();
    }
}

function createRevenueChart() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    const revenueData = {
        labels: ['01/03', '02/03', '03/03', '04/03', '05/03', '06/03', '07/03', '08/03', '09/03', '10/03', '11/03', '12/03'],
        datasets: [{
            label: 'Faturamento Diário (R$)',
            data: [1200, 1500, 1000, 1800, 2200, 1100, 900, 1600, 1400, 2100, 1700, 1900],
            backgroundColor: 'rgba(153, 205, 133, 0.2)',
            borderColor: 'rgba(153, 205, 133, 1)',
            borderWidth: 2,
            tension: 0.4
        }]
    };
    
    new Chart(ctx, {
        type: 'line',
        data: revenueData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createProceduresChart() {
    const ctx = document.getElementById('proceduresChart').getContext('2d');
    
    const proceduresData = {
        labels: ['Limpeza de Pele', 'Botox', 'Massagem', 'Preenchimento', 'Peeling', 'Drenagem'],
        datasets: [{
            label: 'Quantidade de Procedimentos',
            data: [25, 18, 15, 12, 10, 7],
            backgroundColor: [
                'rgba(153, 205, 133, 0.8)',
                'rgba(127, 166, 83, 0.8)',
                'rgba(99, 120, 61, 0.8)',
                'rgba(207, 224, 188, 0.8)',
                'rgba(224, 216, 200, 0.8)',
                'rgba(245, 240, 230, 0.8)'
            ],
            borderColor: [
                'rgba(153, 205, 133, 1)',
                'rgba(127, 166, 83, 1)',
                'rgba(99, 120, 61, 1)',
                'rgba(207, 224, 188, 1)',
                'rgba(224, 216, 200, 1)',
                'rgba(245, 240, 230, 1)'
            ],
            borderWidth: 1
        }]
    };
    
    new Chart(ctx, {
        type: 'doughnut',
        data: proceduresData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });
}