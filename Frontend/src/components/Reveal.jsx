import useReveal from "../hooks/useReveal";

// Wraps children in a scroll-triggered fade-and-rise.
const Reveal = ({ as: Tag = "div", delay = 0, className = "", children, ...rest }) => {
  const [ref, visible] = useReveal();

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
