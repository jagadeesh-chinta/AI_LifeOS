import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

const pillarsData = [
  {
    label: "TASKS",
    title: "Turn intentions into action.",
    description:
      "Organize priorities, deadlines, and daily tasks so nothing important gets lost.",
    image: "/tasks image.png",
  },
  {
    label: "HABITS MONITOR",
    title: "Build consistency. Create progress.",
    description:
      "Track routines, streaks, and daily habits that move you toward your goals.",
    image: "/Habits image.png",
  },
  {
    label: "AI PLANNER",
    title: "Let AI plan what matters.",
    description:
      "AI turns your goals, tasks, deadlines, habits, and available time into a personalized daily plan.",
    image: "/AI_Planner image.png",
  },
  {
    label: "SCHEDULING LIFE",
    title: "Give every moment a purpose.",
    description:
      "Balance work, study, focus time, breaks, habits, and personal commitments in a realistic schedule.",
    image: "/Scheduling Life image.png",
  },
  {
    label: "LIFE CALENDAR",
    title: "See your entire life in one view.",
    description:
      "Connect tasks, habits, events, deadlines, and AI plans in one unified calendar.",
    image: "/Life Calendar image.png",
  },
];

const TOTAL = pillarsData.length;
const GAP = 24;

// Triple the array for seamless infinite loop
const extendedPillars = [...pillarsData, ...pillarsData, ...pillarsData];

const FivePillarsCarousel = () => {
  const viewportRef = useRef(null);
  const [cardsPerView, setCardsPerView] = useState(3);
  const [cardWidth, setCardWidth] = useState(0);
  const [index, setIndex] = useState(TOTAL); // start at 2nd copy
  const [transitionOn, setTransitionOn] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Responsive breakpoints
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      if (w < 768) setCardsPerView(1);
      else if (w < 1024) setCardsPerView(2);
      else setCardsPerView(3);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Measure viewport and compute card width in pixels
  useEffect(() => {
    const measure = () => {
      if (viewportRef.current) {
        const vpWidth = viewportRef.current.offsetWidth;
        const cw = (vpWidth - (cardsPerView - 1) * GAP) / cardsPerView;
        setCardWidth(cw);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [cardsPerView]);

  // Compute pixel offset for the track
  const getOffset = useCallback(
    (i) => -(i * (cardWidth + GAP)),
    [cardWidth]
  );

  // Autoplay: advance every 4s, pause on hover
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setTransitionOn(true);
      setIndex((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, [isHovered]);

  // Seamless loop: snap back without transition after reaching end
  useEffect(() => {
    if (index >= TOTAL * 2) {
      const timeout = setTimeout(() => {
        setTransitionOn(false);
        setIndex(TOTAL);
      }, 1300);
      return () => clearTimeout(timeout);
    }
  }, [index]);

  // Re-enable transition after snap-back
  useEffect(() => {
    if (!transitionOn) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionOn(true);
        });
      });
    }
  }, [transitionOn]);

  // Touch swipe support
  const touchStartX = useRef(0);
  const handleTouchStart = (e) => {
    setIsHovered(true);
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    setIsHovered(false);
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      setTransitionOn(true);
      setIndex((prev) => prev + (diff > 0 ? 1 : -1));
    }
  };

  return (
    <section id="highlights-section" className="bg-white w-full overflow-hidden border-t border-slate-100">
      <div
        style={{
          maxWidth: 1320,
          margin: '0 auto',
          paddingLeft: 32,
          paddingRight: 32,
          paddingTop: 80,
          paddingBottom: 100,
        }}
      >
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7 }}
          style={{ marginBottom: 40 }}
        >
          <h2
            style={{
              fontSize: 38,
              fontWeight: 400,
              color: '#1a2332',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Highlights
          </h2>
        </motion.div>

        {/* Carousel viewport */}
        <motion.div
          ref={viewportRef}
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, delay: 0.12 }}
          style={{ overflow: 'hidden', width: '100%' }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Track */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              display: 'flex',
              gap: GAP,
              transform: `translateX(${getOffset(index)}px)`,
              transition: transitionOn
                ? 'transform 1.2s cubic-bezier(0.25, 1, 0.5, 1)'
                : 'none',
              willChange: 'transform',
            }}
          >
            {extendedPillars.map((pillar, idx) => (
              <div
                key={idx}
                style={{
                  width: cardWidth || 'auto',
                  flexShrink: 0,
                }}
              >
                {/* Image container */}
                <div
                  className="group/img"
                  style={{
                    width: '100%',
                    overflow: 'hidden',
                    borderRadius: 4,
                  }}
                >
                  <img
                    src={pillar.image}
                    alt={`AI LifeOS ${pillar.label}`}
                    loading="lazy"
                    className="transition-transform duration-500 ease-out group-hover/img:scale-[1.15]"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                    }}
                  />
                </div>

                {/* Text */}
                <div style={{ marginTop: 18 }}>
                  <h4
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: '#1a2332',
                      lineHeight: 1.35,
                      margin: '0 0 6px 0',
                    }}
                  >
                    {pillar.title}
                  </h4>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 400,
                      color: '#6b7280',
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    {pillar.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 32 }}>
          {pillarsData.map((_, i) => {
            const activeDot = ((index % TOTAL) + TOTAL) % TOTAL;
            return (
              <button
                key={i}
                onClick={() => {
                  setTransitionOn(true);
                  setIndex(TOTAL + i);
                }}
                aria-label={`Go to ${pillarsData[i].label}`}
                style={{
                  width: activeDot === i ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeDot === i ? '#1a2332' : '#d1d5db',
                  transition: 'all 0.3s ease',
                  padding: 0,
                }}
              />
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default FivePillarsCarousel;
