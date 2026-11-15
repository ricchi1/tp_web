
(() => {
    "use strict";

    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const header = document.querySelector(".site-header");
    const menu = document.querySelector("#menu-toggle");
    let last = window.scrollY;

    // Gestion du header au défilement
    if (header) {
        header.classList.add("header-scroll-ready");

        window.addEventListener("scroll", () => {
            const y = window.scrollY;

            if ((menu && menu.checked) || y < 90 || y < last) {
                header.classList.remove("header-hidden");
            } else if (y > last) {
                header.classList.add("header-hidden");
            }

            last = y;
        }, { passive: true });
    }

    // Barre de progression
    const progressBar = document.createElement("div");
    progressBar.className = "scroll-progress";
    progressBar.setAttribute("aria-hidden", "true");
    document.body.appendChild(progressBar);

    if (header) {
        header.addEventListener("focusin", () => {
            header.classList.remove("header-hidden");
        });
    }

    const updateProgress = () => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

        progressBar.style.transform = `scaleX(${maxScroll > 0 ? window.scrollY / maxScroll : 0})`;
    };

    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();

    // Gestion du menu mobile
    if (menu) {
        menu.addEventListener("change", () => {
            if (menu.checked && header) {
                header.classList.remove("header-hidden");
            }
        });

        document.querySelectorAll(".main-nav a").forEach(a => {
            a.addEventListener("click", () => {
                menu.checked = false;
            });
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && menu.checked) {
                menu.checked = false;
                menu.dispatchEvent(new Event("change", { bubbles: true }));
            }
        });
    }

    // Modale CTA native : fermeture par bouton, clic extérieur ou Échap.
    const ctaModal = document.querySelector("#contact-modal");
    const modalOpeners = document.querySelectorAll("[data-modal-open]");

    if (ctaModal) {
        modalOpeners.forEach(opener => {
            opener.addEventListener("click", event => {
                event.preventDefault();
                ctaModal.showModal();
            });
        });

        ctaModal.querySelector("[data-modal-close]")?.addEventListener("click", () => {
            ctaModal.close();
        });

        ctaModal.addEventListener("click", event => {
            if (event.target === ctaModal) ctaModal.close();
        });
    }

    // Marquer automatiquement la page actuellement ouverte dans la navigation
    const normalizePath = path =>
        path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

    let pagePath = location.pathname;

    if (pagePath.endsWith("/")) {
        pagePath += "index.html";
    }

    const currentPath = normalizePath(pagePath);

    document.querySelectorAll(".main-nav a").forEach(link => {
        const href = link.getAttribute("href");

        if (!href) return;

        const linkPath = normalizePath(new URL(href, location.href).pathname);

        if (linkPath === currentPath) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

    // Animations des éléments lors du défilement
    const targets = document.querySelectorAll(
        "main>section:not(.hero):not(.page-hero),.card,.service-item,.member,.stats-grid>div,.cta-panel"
    );

    if (
        "IntersectionObserver" in window &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    const el = e.target;

                    el.classList.add("is-visible");

                    const cleanReveal = event => {
                        if (event.propertyName !== "opacity") return;

                        el.classList.remove("reveal", "is-visible");
                        el.style.removeProperty("--reveal-delay");
                        el.removeEventListener("transitionend", cleanReveal);
                    };

                    el.addEventListener("transitionend", cleanReveal);
                    obs.unobserve(el);
                }
            });
        }, { threshold: .12 });

        targets.forEach((el, i) => {
            el.classList.add("reveal");
            el.style.setProperty(
                "--reveal-delay",
                Math.min(i % 4, 3) * 75 + "ms"
            );

            io.observe(el);
        });
    } else {
        targets.forEach(el => el.classList.add("is-visible"));
    }

    // Animate each statistics grid once per viewport entry.
    const statGrids = [...document.querySelectorAll(".stats-grid")];
    const counterFrames = new WeakMap();

    statGrids.forEach(grid => {
        [...grid.querySelectorAll("strong")].forEach(el => {
            const raw = el.textContent.trim();
            const target = Number(raw);

            if (!Number.isFinite(target)) return;

            el.dataset.counterTarget = String(target);
            el.dataset.counterWidth = String(raw.length);
            el.textContent = "0".repeat(raw.length);
        });
    });

    const countersIn = grid =>
        [...grid.querySelectorAll("[data-counter-target]")];

    const cancelCounter = el => {
        const frame = counterFrames.get(el);

        if (frame !== undefined) {
            cancelAnimationFrame(frame);
            counterFrames.delete(el);
        }
    };

    const showCounterTarget = el => {
        cancelCounter(el);
        el.textContent = String(el.dataset.counterTarget).padStart(
            Number(el.dataset.counterWidth),
            "0"
        );
    };

    const animateCounter = el => {
        cancelCounter(el);

        const target = Number(el.dataset.counterTarget);
        const width = Number(el.dataset.counterWidth);

        if (reduceMotionQuery.matches) {
            showCounterTarget(el);
            return;
        }

        el.textContent = "0".repeat(width);

        const start = performance.now();
        const duration = 1200;

        const tick = now => {
            const progress = Math.min((now - start) / duration, 1);
            const value = Math.round(target * (1 - Math.pow(1 - progress, 3)));

            el.textContent = String(value).padStart(width, "0");

            if (progress < 1) {
                counterFrames.set(el, requestAnimationFrame(tick));
            } else {
                counterFrames.delete(el);
            }
        };

        counterFrames.set(el, requestAnimationFrame(tick));
    };

    const animateGrid = grid => countersIn(grid).forEach(animateCounter);

    if (statGrids.length) {
        if (reduceMotionQuery.matches) {
            statGrids.forEach(grid => countersIn(grid).forEach(showCounterTarget));
        } else if ("IntersectionObserver" in window) {
            const wasIntersecting = new WeakMap();
            const counterObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    const grid = entry.target;

                    if (entry.isIntersecting && !wasIntersecting.get(grid)) {
                        wasIntersecting.set(grid, true);
                        animateGrid(grid);
                    } else if (!entry.isIntersecting) {
                        wasIntersecting.set(grid, false);
                    }
                });
            }, { threshold: 0.15 });

            statGrids.forEach(grid => counterObserver.observe(grid));
        } else {
            const wasVisible = new WeakMap();

            const checkGridVisibility = () => {
                statGrids.forEach(grid => {
                    const rect = grid.getBoundingClientRect();
                    const isVisible = rect.bottom > 0 && rect.top < window.innerHeight;

                    if (isVisible && !wasVisible.get(grid)) {
                        animateGrid(grid);
                    }

                    wasVisible.set(grid, isVisible);
                });
            };

            window.addEventListener("scroll", checkGridVisibility, { passive: true });
            window.addEventListener("resize", checkGridVisibility, { passive: true });
            checkGridVisibility();
        }

        reduceMotionQuery.addEventListener?.("change", event => {
            if (event.matches) {
                statGrids.forEach(grid => countersIn(grid).forEach(showCounterTarget));
            }
        });
    }

    // Carrousel accessible : commandes, pause, clavier, tactile et rotation automatique
    document.querySelectorAll("[data-testimonial-carousel]").forEach(carousel => {
        const slides = [...carousel.querySelectorAll(".testimonial-slide")];

        if (!slides.length) return;

        const dotsContainer = carousel.querySelector(
            "[data-carousel-dots], .testimonial-dots"
        );

        let dots = [...carousel.querySelectorAll("[data-carousel-dot]")];

        const previous = carousel.querySelector("[data-carousel-prev]");
        const next = carousel.querySelector("[data-carousel-next]");

        let active = 0;
        let timer = null;
        let manuallyPaused = reduceMotionQuery.matches;
        let hovering = false;
        let focused = false;
        let pageHidden = document.hidden;

        // Création automatique des points de navigation
        if (!dots.length && dotsContainer) {
            slides.forEach((slide, index) => {
                const dot = document.createElement("button");

                dot.type = "button";
                dot.className = "carousel-dot";
                dot.dataset.carouselDot = String(index);

                dot.setAttribute(
                    "aria-label",
                    "Afficher le témoignage " + (index + 1)
                );

                dotsContainer.append(dot);
            });

            dots = [...dotsContainer.querySelectorAll("[data-carousel-dot]")];
        }

        // Accessibilité des diapositives
        slides.forEach((slide, index) => {
            slide.setAttribute("role", "group");
            slide.setAttribute("aria-roledescription", "diapositive");
            slide.setAttribute(
                "aria-label",
                (index + 1) + " sur " + slides.length
            );
        });

        // Afficher une diapositive
        const show = (index, direction = 1) => {
            active = (index + slides.length) % slides.length;

            carousel.style.setProperty("--dir", String(direction));

            slides.forEach((slide, i) => {
                const selected = i === active;

                slide.hidden = !selected;
                slide.classList.toggle("is-active", selected);
                slide.setAttribute("aria-hidden", String(!selected));
            });

            dots.forEach((dot, i) => {
                if (i === active) {
                    dot.setAttribute("aria-current", "true");
                    dot.classList.add("active");
                } else {
                    dot.removeAttribute("aria-current");
                    dot.classList.remove("active");
                }
            });
        };

        // Arrêter le défilement automatique
        const stop = () => {
            if (timer !== null) {
                window.clearInterval(timer);
            }

            timer = null;
        };

        // Relancer le défilement automatique
        const restart = () => {
            stop();

            if (
                !manuallyPaused &&
                !hovering &&
                !focused &&
                !pageHidden &&
                slides.length > 1
            ) {
                timer = window.setInterval(() => show(active + 1, 1), 6000);
            }
        };

        // Bouton pause
        let pauseButton = carousel.querySelector("[data-carousel-pause]");

        if (!pauseButton) {
            pauseButton = document.createElement("button");

            pauseButton.type = "button";
            pauseButton.className = "carousel-arrow carousel-pause";
            pauseButton.dataset.carouselPause = "";

            const controls = carousel.querySelector(".testimonial-controls");

            if (controls) {
                controls.append(pauseButton);
            }
        }

        const syncPauseButton = () => {
            pauseButton.textContent = manuallyPaused ? "▶" : "Ⅱ";

            pauseButton.setAttribute(
                "aria-pressed",
                String(manuallyPaused)
            );

            pauseButton.setAttribute(
                "aria-label",
                manuallyPaused
                    ? "Reprendre le défilement automatique"
                    : "Mettre en pause le défilement automatique"
            );

            pauseButton.title = manuallyPaused ? "Reprendre" : "Mettre en pause";
            pauseButton.hidden = slides.length < 2;
        };

        // Navigation avec les points
        dots.forEach((dot, index) => {
            dot.addEventListener("click", () => {
                show(index, index >= active ? 1 : -1);
                restart();
            });
        });

        // Bouton précédent
        previous?.addEventListener("click", () => {
            show(active - 1, -1);
            restart();
        });

        // Bouton suivant
        next?.addEventListener("click", () => {
            show(active + 1, 1);
            restart();
        });

        // Gestion du bouton pause
        pauseButton.addEventListener("click", () => {
            manuallyPaused = !manuallyPaused;

            syncPauseButton();
            restart();
        });

        // Pause au survol
        carousel.addEventListener("pointerenter", () => {
            hovering = true;
            stop();
        });

        carousel.addEventListener("pointerleave", () => {
            hovering = false;
            restart();
        });

        // Pause lorsque le carrousel reçoit le focus
        carousel.addEventListener("focusin", () => {
            focused = true;
            stop();
        });

        carousel.addEventListener("focusout", event => {
            if (!carousel.contains(event.relatedTarget)) {
                focused = false;
                restart();
            }
        });

        // Navigation avec les touches du clavier
        carousel.addEventListener("keydown", event => {
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                show(active - 1, -1);
                restart();
            } else if (event.key === "ArrowRight") {
                event.preventDefault();
                show(active + 1, 1);
                restart();
            }
        });

        // Navigation tactile
        let touchStartX = null;

        carousel.addEventListener("touchstart", event => {
            touchStartX = event.touches[0]?.clientX ?? null;
        }, { passive: true });

        carousel.addEventListener("touchend", event => {
            if (touchStartX === null) return;

            const deltaX = event.changedTouches[0].clientX - touchStartX;

            touchStartX = null;

            if (Math.abs(deltaX) > 50) {
                const direction = deltaX < 0 ? 1 : -1;

                show(active + direction, direction);
                restart();
            }
        }, { passive: true });

        // Arrêter le carrousel lorsque la page est masquée
        document.addEventListener("visibilitychange", () => {
            pageHidden = document.hidden;

            if (pageHidden) {
                stop();
            } else {
                restart();
            }
        });

        // Respecter les préférences de réduction des animations
        reduceMotionQuery.addEventListener?.("change", event => {
            if (event.matches) {
                manuallyPaused = true;
                stop();
            }

            syncPauseButton();
            restart();
        });

        show(0);
        syncPauseButton();
        restart();
    });

    // Formulaire de contact
    const form = document.querySelector(".form");

    if (form) {
        const draftStatus = document.createElement("div");
        draftStatus.className = "form-status";
        draftStatus.setAttribute("role", "status");
        draftStatus.setAttribute("aria-live", "polite");
        draftStatus.hidden = true;
        form.appendChild(draftStatus);

        const fields = [
            form.querySelector("#nom"),
            form.querySelector("#email"),
            form.querySelector("#type"),
            form.querySelector("#message")
        ].filter(Boolean);

        // Effacer les erreurs
        const clear = f => {
            form.querySelector("#" + f.id + "-error")?.remove();

            f.removeAttribute("aria-invalid");
            f.removeAttribute("aria-describedby");
        };

        // Afficher une erreur
        const error = (f, msg) => {
            let el = form.querySelector("#" + f.id + "-error");

            if (!el) {
                el = document.createElement("small");

                el.id = f.id + "-error";
                el.className = "field-error";
                el.setAttribute("role", "alert");

                f.insertAdjacentElement("afterend", el);
            }

            el.textContent = msg;

            f.setAttribute("aria-invalid", "true");
            f.setAttribute("aria-describedby", el.id);
        };

        // Validation des champs
        const validate = f => {
            clear(f);

            const v = f.value.trim();

            if (!v) {
                error(f, "Ce champ est obligatoire.");
                return false;
            }

            if (f.id === "nom" && v.length < 2) {
                error(f, "Le nom doit contenir au moins 2 caractères.");
                return false;
            }

            if (f.id === "nom" && v.length > 80) {
                error(f, "Le nom ne doit pas dépasser 80 caractères.");
                return false;
            }

            if (f.id === "email" && v.length > 254) {
                error(f, "L'adresse e-mail ne doit pas dépasser 254 caractères.");
                return false;
            }

            if (
                f.id === "email" &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
            ) {
                error(f, "Veuillez saisir une adresse e-mail valide.");
                return false;
            }

            if (f.id === "message" && v.length < 20) {
                error(f, "Votre message doit contenir au moins 20 caractères.");
                return false;
            }

            if (f.id === "message" && v.length > 1000) {
                error(f, "Votre message ne doit pas dépasser 1000 caractères.");
                return false;
            }

            return true;
        };

        // Validation lors de la saisie
        fields.forEach(f => {
            f.addEventListener("blur", () => validate(f));

            f.addEventListener("input", () => {
                draftStatus.hidden = true;
                draftStatus.replaceChildren();

                if (f.hasAttribute("aria-invalid")) {
                    validate(f);
                }
            });
        });

        // Envoi du formulaire
        form.addEventListener("submit", e => {
            e.preventDefault();

            if (!fields.map(validate).every(Boolean)) {
                form.querySelector('[aria-invalid="true"]')?.focus();
                return;
            }

            const data = new FormData(form);

            const subject =
                "Demande de contact Novatech — " + data.get("Type de projet");

            const body = [
                "Nom : " + data.get("Nom"),
                "E-mail : " + data.get("Email"),
                "Type de projet : " + data.get("Type de projet"),
                "",
                "Message :",
                data.get("Message")
            ].join("\n");

            const mailto =
                "mailto:contact@novatech.com?subject=" +
                encodeURIComponent(subject) +
                "&body=" +
                encodeURIComponent(body);

            const confirmation = document.createElement("p");
            confirmation.textContent =
                "Votre brouillon est prêt. Le site ne l’envoie pas : validez l’envoi dans votre messagerie.";

            const openMail = document.createElement("a");
            openMail.className = "btn form-mail-link";
            openMail.href = mailto;
            openMail.textContent = "Ouvrir dans ma messagerie ↗";

            const preview = document.createElement("details");
            preview.className = "form-mail-preview";

            const summary = document.createElement("summary");
            summary.textContent = "Vérifier le destinataire, l’objet et le message";

            const recipient = document.createElement("p");
            recipient.textContent = "À : contact@novatech.com";

            const subjectPreview = document.createElement("p");
            subjectPreview.textContent = "Objet : " + subject;

            const bodyPreview = document.createElement("pre");
            bodyPreview.textContent = body;

            preview.append(summary, recipient, subjectPreview, bodyPreview);
            draftStatus.replaceChildren(confirmation, openMail, preview);
            draftStatus.hidden = false;
        });

        const message = form.querySelector("#message");

        if (message) {
            message.minLength = 20;
            message.maxLength = 1000;
        }

        const name = form.querySelector("#nom");
        if (name) {
            name.minLength = 2;
            name.maxLength = 80;
        }

        const email = form.querySelector("#email");
        if (email) email.maxLength = 254;
    }

    // Bouton retour en haut de la page
    const topBtn = document.createElement("button");

    topBtn.type = "button";
    topBtn.className = "back-to-top";
    topBtn.setAttribute("aria-label", "Retour en haut de la page");
    topBtn.textContent = "↑";

    document.body.appendChild(topBtn);

    topBtn.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth"
        });
    });

    const updateTopButton = () => {
        topBtn.classList.toggle("is-shown", window.scrollY > 600);
    };

    window.addEventListener("scroll", updateTopButton, { passive: true });

    updateTopButton();

})();
