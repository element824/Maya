function handleSubmit(e) {
  e.preventDefault();
  document.getElementById('form-msg').textContent = 'sent — talk soon';
  e.target.reset();
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll('section, .grid-item').forEach((el) => {
  el.classList.add('fade-in');
  observer.observe(el);
});

const s = document.createElement('style');
s.textContent = `
  .fade-in {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.7s ease, transform 0.7s ease;
  }
  .fade-in.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .grid-item.fade-in { transition-delay: calc(var(--i, 0) * 0.1s); }
`;
document.head.appendChild(s);

document.querySelectorAll('.grid-item').forEach((item, i) => {
  item.style.setProperty('--i', i);
});
