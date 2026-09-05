import { useEffect, useRef, useState } from "react";

// Adds `is-visible` to a `.reveal` element the first time it scrolls into
// view. Falls back to visible immediately where IntersectionObserver is
// missing, so content is never stranded at opacity 0.
export const useReveal = (threshold = 0.12, rootMargin = "0px 0px -8% 0px") => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, visible];
};

export default useReveal;
