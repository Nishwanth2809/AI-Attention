import { useEffect, useRef } from 'react';
export default function useModalFocus(active, onClose) {
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement;
    const modal = document.querySelector('[role="dialog"]');
    if (!modal) return;
    const elements = () => [...modal.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')];
    elements()[0]?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const list = elements(), first = list[0], last = list.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [active]);
}
