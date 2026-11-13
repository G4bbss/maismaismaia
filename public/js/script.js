document.addEventListener("DOMContentLoaded", () => {
    // 1. Menu mobile da página inicial (index.html)
    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navLinks");

    if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", function () {
            navLinks.classList.toggle("open");
        });

        navLinks.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                navLinks.classList.remove("open");
            });
        });
    }

    // 2. Menu mobile automático para todas as telas internas com .sidebar
    const sidebar = document.querySelector(".sidebar");
    if (sidebar && !sidebar.querySelector(".sidebar-mobile-header")) {
        const logoOriginal = sidebar.querySelector(".logo");
        const logoHTML = logoOriginal ? logoOriginal.innerHTML : "Maia";

        const mobileHeader = document.createElement("div");
        mobileHeader.className = "sidebar-mobile-header";
        mobileHeader.innerHTML = `
            <div class="logo">${logoHTML}</div>
            <button type="button" class="btn-sidebar-toggle" aria-label="Abrir menu">☰</button>
        `;

        sidebar.insertBefore(mobileHeader, sidebar.firstChild);
        sidebar.classList.add("com-toggle");

        const btnToggle = mobileHeader.querySelector(".btn-sidebar-toggle");
        btnToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            sidebar.classList.toggle("aberta");
            btnToggle.textContent = sidebar.classList.contains("aberta") ? "✕" : "☰";
        });

        // Fecha o menu ao clicar em qualquer link
        sidebar.querySelectorAll("nav a").forEach((link) => {
            link.addEventListener("click", () => {
                sidebar.classList.remove("aberta");
                btnToggle.textContent = "☰";
            });
        });

        // Fecha o menu ao tocar fora dele
        document.addEventListener("click", (e) => {
            if (!sidebar.contains(e.target) && sidebar.classList.contains("aberta")) {
                sidebar.classList.remove("aberta");
                btnToggle.textContent = "☰";
            }
        });
    }
});