"use client";

import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import styles from "@/app/landing.module.css";

interface SignalPoint {
  key: string;
  label: string;
  route?: string;
  portalRadius: number;
  x: number;
  y: number;
}

interface SignalLayout {
  width: number;
  height: number;
  points: SignalPoint[];
  segments: string[];
  triggers: number[];
}

const EMPTY_LAYOUT: SignalLayout = {
  width: 1,
  height: 1,
  points: [],
  segments: [],
  triggers: [],
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function createSegment(
  start: SignalPoint,
  end: SignalPoint,
  index: number,
  width: number,
) {
  const startX = start.x;
  const startY = start.y + start.portalRadius;
  const endX = end.x;
  const endY = end.y - end.portalRadius;
  const distanceY = Math.max(1, endY - startY);

  if (start.route === "journey" && end.route === "journey") {
    return `M ${startX.toFixed(1)} ${startY.toFixed(1)} L ${endX.toFixed(1)} ${endY.toFixed(1)}`;
  }

  const direction = index % 2 === 0 ? 1 : -1;
  const bend =
    Math.min(width * 0.12, Math.max(56, distanceY * 0.16)) * direction;
  const controlY = Math.min(distanceY * 0.46, 280);

  return [
    `M ${startX.toFixed(1)} ${startY.toFixed(1)}`,
    `C ${(startX + bend).toFixed(1)} ${(startY + controlY).toFixed(1)}`,
    `${(endX - bend * 0.72).toFixed(1)} ${(endY - controlY).toFixed(1)}`,
    `${endX.toFixed(1)} ${endY.toFixed(1)}`,
  ].join(" ");
}

export function ScrollSignal() {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const [layout, setLayout] = useState<SignalLayout>(EMPTY_LAYOUT);
  const [activeLabel, setActiveLabel] = useState("SIGNAL ONLINE");
  const layoutRef = useRef<SignalLayout>(EMPTY_LAYOUT);
  const activePathRefs = useRef<Array<SVGPathElement | null>>([]);
  const segmentLengthsRef = useRef<number[]>([]);
  const nodeRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const anchorRefs = useRef<HTMLElement[]>([]);
  const cometRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLSpanElement>(null);
  const coreRef = useRef<HTMLSpanElement>(null);
  const activeStageRef = useRef(-1);
  const previousScrollRef = useRef(0);
  const movingTimerRef = useRef<number | null>(null);
  const arrivalTimerRef = useRef<number | null>(null);

  const updateSignal = useCallback(
    (scrollTop: number, userInitiated = true) => {
      const currentLayout = layoutRef.current;
      const { points, triggers } = currentLayout;
      const comet = cometRef.current;
      if (!comet || points.length < 2) return;

      let segmentIndex = points.length - 2;
      for (let index = 0; index < triggers.length - 1; index += 1) {
        if (scrollTop <= triggers[index + 1]!) {
          segmentIndex = index;
          break;
        }
      }

      const startTrigger = triggers[segmentIndex] ?? 0;
      const endTrigger = Math.max(
        startTrigger + 1,
        triggers[segmentIndex + 1] ?? startTrigger + 1,
      );
      const progress = clamp(
        (scrollTop - startTrigger) / (endTrigger - startTrigger),
        0,
        1,
      );
      const path = activePathRefs.current[segmentIndex];
      const pathLength = segmentLengthsRef.current[segmentIndex] ?? 1;
      const start = points[segmentIndex]!;
      const end = points[segmentIndex + 1]!;

      const startX = start.x;
      const startY = start.y + start.portalRadius;
      const endX = end.x;
      const endY = end.y - end.portalRadius;
      let x = startX + (endX - startX) * progress;
      let y = startY + (endY - startY) * progress;
      let angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

      if (path && pathLength > 1) {
        const distance = progress * pathLength;
        const point = path.getPointAtLength(distance);
        const nextPoint = path.getPointAtLength(
          Math.min(pathLength, distance + 3),
        );
        x = point.x;
        y = point.y;
        angle =
          Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) *
          (180 / Math.PI);
      }

      activePathRefs.current.forEach((activePath, index) => {
        if (!activePath) return;
        const length = segmentLengthsRef.current[index] ?? 1;
        activePath.style.strokeDasharray = `${length}`;
        activePath.style.strokeDashoffset = `${
          index < segmentIndex
            ? 0
            : index === segmentIndex
              ? length * (1 - progress)
              : length
        }`;
        activePath.style.opacity = index <= segmentIndex ? "1" : "0";
      });

      comet.style.opacity = "1";
      comet.style.transform = `translate3d(${x - 15}px, ${y - 15}px, 0)`;
      comet.dataset.side = x > currentLayout.width * 0.72 ? "left" : "right";
      tailRef.current?.style.setProperty(
        "transform",
        `translateY(-50%) rotate(${angle}deg)`,
      );
      coreRef.current?.style.setProperty(
        "transform",
        `rotate(${scrollTop * 0.18}deg)`,
      );

      const movingDown = scrollTop >= previousScrollRef.current;
      previousScrollRef.current = scrollTop;
      const distanceFromStart = progress * pathLength;
      const distanceFromEnd = (1 - progress) * pathLength;
      let portalState = "";

      if (userInitiated && movingDown) {
        if (end.portalRadius > 0 && distanceFromEnd <= 34) {
          portalState = "dissolving";
        } else if (start.portalRadius > 0 && distanceFromStart <= 54) {
          portalState = "reforming";
        }
      } else if (userInitiated) {
        if (start.portalRadius > 0 && distanceFromStart <= 34) {
          portalState = "dissolving";
        } else if (end.portalRadius > 0 && distanceFromEnd <= 54) {
          portalState = "reforming";
        }
      }

      if (portalState) {
        comet.dataset.portalState = portalState;
      } else {
        delete comet.dataset.portalState;
      }

      const contactProgress = clamp(1 - 30 / pathLength, 0.72, 0.985);
      const stageIndex =
        progress >= contactProgress ? segmentIndex + 1 : segmentIndex;
      if (stageIndex !== activeStageRef.current) {
        activeStageRef.current = stageIndex;
        setActiveLabel(points[stageIndex]?.label ?? "SIGNAL ONLINE");
        nodeRefs.current.forEach((node, index) => {
          if (!node) return;
          node.dataset.active = String(index === stageIndex);
          node.dataset.visited = String(index < stageIndex);
        });
        anchorRefs.current.forEach((anchor, index) => {
          anchor.dataset.signalActive = String(index === stageIndex);
          anchor.dataset.signalVisited = String(index < stageIndex);
        });
        if (points[stageIndex]?.portalRadius) {
          delete comet.dataset.arriving;
          if (arrivalTimerRef.current)
            window.clearTimeout(arrivalTimerRef.current);
        } else {
          comet.dataset.arriving = "true";
          if (arrivalTimerRef.current)
            window.clearTimeout(arrivalTimerRef.current);
          arrivalTimerRef.current = window.setTimeout(() => {
            delete comet.dataset.arriving;
          }, 620);
        }
      }

      if (userInitiated) {
        comet.dataset.moving = "true";
        if (movingTimerRef.current) window.clearTimeout(movingTimerRef.current);
        movingTimerRef.current = window.setTimeout(() => {
          delete comet.dataset.moving;
        }, 720);
      }
    },
    [],
  );

  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-signal-root]");
    if (!root) return;

    let frame = 0;
    let cancelled = false;

    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (cancelled) return;
        const rootBounds = root.getBoundingClientRect();
        const anchorElements = Array.from(
          root.querySelectorAll<HTMLElement>("[data-signal-anchor]"),
        ).sort(
          (first, second) =>
            Number(first.dataset.signalOrder ?? 0) -
            Number(second.dataset.signalOrder ?? 0),
        );
        anchorRefs.current = anchorElements;

        const points = anchorElements.map((element, index) => {
          const bounds = element.getBoundingClientRect();
          const portalRatio = Number(element.dataset.signalPortalRatio ?? 0);
          return {
            key: element.dataset.signalAnchor ?? String(index),
            label: element.dataset.signalLabel ?? "SIGNAL ONLINE",
            route: element.dataset.signalRoute,
            portalRadius:
              portalRatio > 0
                ? Math.min(bounds.width, bounds.height) * portalRatio
                : 0,
            x: bounds.left - rootBounds.left + bounds.width / 2,
            y: bounds.top - rootBounds.top + bounds.height / 2,
          };
        });

        if (points.length < 2) return;

        const maxScroll = Math.max(
          1,
          document.documentElement.scrollHeight - window.innerHeight,
        );
        const triggers: number[] = [];
        points.forEach((point, index) => {
          if (index === 0) {
            triggers.push(0);
            return;
          }

          const minimum = index === 1 ? Math.min(180, maxScroll) : 0;
          let trigger = clamp(
            point.y - window.innerHeight * 0.38,
            minimum,
            maxScroll,
          );
          const previous = triggers[index - 1] ?? 0;
          if (trigger <= previous && previous < maxScroll)
            trigger = Math.min(maxScroll, previous + 1);
          triggers.push(trigger);
        });

        const width = rootBounds.width;
        const nextLayout = {
          width,
          height: root.scrollHeight,
          points,
          segments: points
            .slice(0, -1)
            .map((point, index) =>
              createSegment(point, points[index + 1]!, index, width),
            ),
          triggers,
        };

        layoutRef.current = nextLayout;
        setLayout(nextLayout);
      });
    };

    const resizeObserver = new ResizeObserver(measure);
    let settleTimer = 0;
    const revealObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(measure, 620);
      },
      { rootMargin: "80px 0px" },
    );
    resizeObserver.observe(root);
    root
      .querySelectorAll<HTMLElement>("[data-signal-anchor]")
      .forEach((element) => {
        resizeObserver.observe(element);
        revealObserver.observe(element);
      });
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure);
    measure();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      resizeObserver.disconnect();
      revealObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useLayoutEffect(() => {
    layoutRef.current = layout;
    segmentLengthsRef.current = activePathRefs.current.map(
      (path) => path?.getTotalLength() ?? 1,
    );
    updateSignal(window.scrollY, false);
  }, [layout, updateSignal]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (!reduceMotion) updateSignal(latest);
  });

  useEffect(
    () => () => {
      if (movingTimerRef.current) window.clearTimeout(movingTimerRef.current);
      if (arrivalTimerRef.current) window.clearTimeout(arrivalTimerRef.current);
    },
    [],
  );

  if (layout.points.length < 2) return null;

  return (
    <div className={styles.signalJourneyLayer} aria-hidden="true">
      <svg
        className={styles.signalGuide}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="scroll-signal-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8a5a12" />
            <stop offset="0.5" stopColor="#ffd976" />
            <stop offset="1" stopColor="#fff0b5" />
          </linearGradient>
        </defs>
        <g className={styles.signalPathBase}>
          {layout.segments.map((segment, index) => (
            <path key={`base-${index}`} d={segment} />
          ))}
        </g>
        <g className={styles.signalPathActive}>
          {layout.segments.map((segment, index) => (
            <path
              key={`active-${index}`}
              ref={(node) => {
                activePathRefs.current[index] = node;
              }}
              d={segment}
            />
          ))}
        </g>
      </svg>

      {layout.points.map((point, index) => (
        <span
          key={point.key}
          ref={(node) => {
            nodeRefs.current[index] = node;
          }}
          className={styles.signalNode}
          data-active={index === 0}
          data-portal={point.portalRadius > 0}
          data-visited="false"
          style={{
            transform: `translate3d(${point.x - 8}px, ${point.y - 8}px, 0)`,
          }}
        />
      ))}

      <div ref={cometRef} className={styles.signalComet} data-side="right">
        <span ref={tailRef} className={styles.signalCometTail} />
        <span className={styles.signalCometLabel}>
          <i />
          {activeLabel}
        </span>
        <span ref={coreRef} className={styles.signalCometCore}>
          <svg viewBox="0 0 32 32">
            <path d="M16 1.5c1.45 8.55 5.95 13.05 14.5 14.5C21.95 17.45 17.45 21.95 16 30.5 14.55 21.95 10.05 17.45 1.5 16 10.05 14.55 14.55 10.05 16 1.5Z" />
          </svg>
        </span>
        <i className={styles.signalSpark} />
        <i className={styles.signalSpark} />
        <i className={styles.signalSpark} />
        <span className={styles.signalFragmentField} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}
