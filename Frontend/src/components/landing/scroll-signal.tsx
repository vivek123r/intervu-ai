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
  traceName?: string;
  tracePath?: string;
  triggerY?: number;
  portalRadius: number;
  orbitRadius: number;
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

function getRootPathPoint(
  path: SVGPathElement,
  distance: number,
  rootBounds: DOMRect,
) {
  const svg = path.ownerSVGElement;
  const matrix = path.getScreenCTM();
  if (!svg || !matrix) return null;

  const source = path.getPointAtLength(distance);
  const point = svg.createSVGPoint();
  point.x = source.x;
  point.y = source.y;
  const screenPoint = point.matrixTransform(matrix);
  return {
    x: screenPoint.x - rootBounds.left,
    y: screenPoint.y - rootBounds.top,
  };
}

function sampleRootPath(path: SVGPathElement, rootBounds: DOMRect) {
  const length = path.getTotalLength();
  const samples = 64;
  const points = Array.from({ length: samples + 1 }, (_, index) =>
    getRootPathPoint(path, (length * index) / samples, rootBounds),
  ).filter((point): point is { x: number; y: number } => point !== null);

  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
    )
    .join(" ");
}

function createSegment(
  start: SignalPoint,
  end: SignalPoint,
  index: number,
  width: number,
) {
  if (start.tracePath) return start.tracePath;

  const startX = start.x;
  const startY =
    start.y + (start.orbitRadius > 0 ? start.orbitRadius : start.portalRadius);
  const endX = end.x;
  const endY =
    end.y - (end.orbitRadius > 0 ? end.orbitRadius : end.portalRadius);
  const distanceY = Math.max(1, endY - startY);
  const isMobile = width < 860;

  // 1. Straight rail connections (Journey steps 01 -> 02 -> 03 -> 04)
  if (start.route === "journey" && end.route === "journey") {
    return `M ${startX.toFixed(1)} ${startY.toFixed(1)} L ${endX.toFixed(1)} ${endY.toFixed(1)}`;
  }

  // 2. Nav Brand Origin -> Hero Console Readiness
  if (start.key === "origin" && end.key === "readiness") {
    const cp1Y = startY + distanceY * 0.45;
    const cp2X = endX - Math.min(120, (endX - startX) * 0.4);
    const cp2Y = endY - distanceY * 0.25;
    return [
      `M ${startX.toFixed(1)} ${startY.toFixed(1)}`,
      `C ${startX.toFixed(1)} ${cp1Y.toFixed(1)} ${cp2X.toFixed(1)} ${cp2Y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
    ].join(" ");
  }

  // 3. Hero Console Readiness -> Journey Step 01 (detected / interview-detected)
  if (
    start.key === "readiness" &&
    (end.key === "detected" || end.key === "interview-detected")
  ) {
    const cp1Y = startY + distanceY * 0.38;
    const cp2X = startX - Math.min(220, (startX - endX) * 0.5);
    const cp2Y = endY - distanceY * 0.35;
    return [
      `M ${startX.toFixed(1)} ${startY.toFixed(1)}`,
      `C ${cp2X.toFixed(1)} ${cp1Y.toFixed(1)} ${endX.toFixed(1)} ${cp2Y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
    ].join(" ");
  }

  // 4. Fallback if readiness is not in layout: Origin -> Journey Step 01
  if (
    start.key === "origin" &&
    (end.key === "detected" || end.key === "interview-detected")
  ) {
    const midY1 = startY + distanceY * 0.35;
    const midY2 = endY - distanceY * 0.35;
    return [
      `M ${startX.toFixed(1)} ${startY.toFixed(1)}`,
      `C ${startX.toFixed(1)} ${midY1.toFixed(1)} ${endX.toFixed(1)} ${midY2.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
    ].join(" ");
  }

  // 5. Journey Step 04 (evidence-action) -> Intelligence Context Machine (context)
  if (start.key === "evidence-action" && end.key === "context") {
    if (isMobile) {
      return `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${startX.toFixed(1)} ${(startY + distanceY * 0.35).toFixed(1)} ${endX.toFixed(1)} ${(endY - distanceY * 0.35).toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
    }
    const dropY = startY + distanceY * 0.52;
    const cp2X = endX - Math.min(180, (endX - startX) * 0.45);
    return [
      `M ${startX.toFixed(1)} ${startY.toFixed(1)}`,
      `C ${startX.toFixed(1)} ${dropY.toFixed(1)} ${cp2X.toFixed(1)} ${endY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
    ].join(" ");
  }

  // 6. Context Machine -> AI Orb with single continuous orbital sweep
  if (end.orbitRadius > 0) {
    const cx = end.x;
    const cy = end.y;
    const R = end.orbitRadius;
    const entryX = cx;
    const entryY = cy - R;
    const distY = Math.max(1, entryY - startY);
    const cp1Y = startY + distY * 0.42;
    const cp2X = entryX - Math.min(100, R * 0.85);
    const cp2Y = entryY;

    return [
      `M ${startX.toFixed(1)} ${startY.toFixed(1)}`,
      `C ${startX.toFixed(1)} ${cp1Y.toFixed(1)} ${cp2X.toFixed(1)} ${cp2Y.toFixed(1)} ${entryX.toFixed(1)} ${entryY.toFixed(1)}`,
      `A ${R.toFixed(1)} ${R.toFixed(1)} 0 0 1 ${cx.toFixed(1)} ${(cy + R).toFixed(1)}`,
    ].join(" ");
  }

  // 7. Starting from Orbit node (AI Orb -> Analysis Lead)
  if (start.orbitRadius > 0) {
    const startOrbitX = start.x;
    const startOrbitY = start.y + start.orbitRadius;
    const distY = Math.max(1, endY - startOrbitY);
    const cp1Y = startOrbitY + Math.min(distY * 0.35, 220);
    const cp2Y = endY - Math.min(distY * 0.35, 220);

    return [
      `M ${startOrbitX.toFixed(1)} ${startOrbitY.toFixed(1)}`,
      `C ${startOrbitX.toFixed(1)} ${cp1Y.toFixed(1)} ${endX.toFixed(1)} ${cp2Y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
    ].join(" ");
  }

  // 8. Analysis Lead -> Momentum Trend Chart
  if (start.key === "evidence" && end.key === "momentum") {
    if (isMobile) {
      return `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${startX.toFixed(1)} ${(startY + distanceY * 0.35).toFixed(1)} ${endX.toFixed(1)} ${(endY - distanceY * 0.35).toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
    }
    const midY1 = startY + distanceY * 0.42;
    const midY2 = startY + distanceY * 0.65;
    return [
      `M ${startX.toFixed(1)} ${startY.toFixed(1)}`,
      `C ${startX.toFixed(1)} ${midY1.toFixed(1)} ${endX.toFixed(1)} ${midY2.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
    ].join(" ");
  }

  // 9. Completed momentum chart -> Final CTA
  if (start.key === "momentum-complete" && end.key === "next-move") {
    const edgeX = Math.min(
      width - 24,
      Math.max(startX + (isMobile ? 32 : 110), endX + 36),
    );
    return [
      `M ${startX.toFixed(1)} ${startY.toFixed(1)}`,
      `C ${edgeX.toFixed(1)} ${(startY + distanceY * 0.2).toFixed(1)} ${edgeX.toFixed(1)} ${(endY - distanceY * 0.28).toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
    ].join(" ");
  }

  // Default smooth corridor bezier
  const midY1 = startY + distanceY * 0.35;
  const midY2 = endY - distanceY * 0.35;
  return [
    `M ${startX.toFixed(1)} ${startY.toFixed(1)}`,
    `C ${startX.toFixed(1)} ${midY1.toFixed(1)} ${endX.toFixed(1)} ${midY2.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
  ].join(" ");
}

export function ScrollSignal() {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const [layout, setLayout] = useState<SignalLayout>(EMPTY_LAYOUT);
  const [activeLabel, setActiveLabel] = useState("SIGNAL ONLINE");
  const layoutRef = useRef<SignalLayout>(EMPTY_LAYOUT);
  const rootRef = useRef<HTMLElement | null>(null);
  const basePathRefs = useRef<Array<SVGPathElement | null>>([]);
  const activePathRefs = useRef<Array<SVGPathElement | null>>([]);
  const tracePathRefs = useRef<Map<string, SVGPathElement>>(new Map());
  const segmentLengthsRef = useRef<number[]>([]);
  const nodeRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const anchorRefs = useRef<HTMLElement[]>([]);
  const cometRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLSpanElement>(null);
  const coreRef = useRef<HTMLSpanElement>(null);
  const activeStageRef = useRef(-1);
  const previousScrollRef = useRef(0);
  const movingDownRef = useRef(true);
  const movingTimerRef = useRef<number | null>(null);
  const arrivalTimerRef = useRef<number | null>(null);

  const updateSignal = useCallback(
    (scrollTop: number, userInitiated = true) => {
      const currentLayout = layoutRef.current;
      let { points } = currentLayout;
      const { triggers } = currentLayout;
      const comet = cometRef.current;
      if (!comet || points.length < 2) return;

      const root = rootRef.current;
      const originAnchor = anchorRefs.current[0];
      if (root && points[0]?.key === "origin" && originAnchor) {
        const rootBounds = root.getBoundingClientRect();
        const originBounds = originAnchor.getBoundingClientRect();
        const origin = {
          ...points[0],
          x: originBounds.left - rootBounds.left + originBounds.width / 2,
          y: originBounds.top - rootBounds.top + originBounds.height / 2,
        };
        const originSegment = createSegment(
          origin,
          points[1]!,
          0,
          currentLayout.width,
        );
        points = [origin, ...points.slice(1)];
        basePathRefs.current[0]?.setAttribute("d", originSegment);
        activePathRefs.current[0]?.setAttribute("d", originSegment);
        segmentLengthsRef.current[0] =
          activePathRefs.current[0]?.getTotalLength() ??
          segmentLengthsRef.current[0] ??
          1;
      }

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
      const startY =
        start.y +
        (start.orbitRadius > 0 ? start.orbitRadius : start.portalRadius);
      const endX = end.x;
      const endY =
        end.y - (end.orbitRadius > 0 ? end.orbitRadius : end.portalRadius);
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

      const scrollDelta = scrollTop - previousScrollRef.current;
      if (userInitiated && Math.abs(scrollDelta) > 0.5) {
        movingDownRef.current = scrollDelta > 0;
      }
      previousScrollRef.current = scrollTop;
      const movingDown = movingDownRef.current;

      const traceIndex = points.findIndex((point) => Boolean(point.tracePath));
      if (traceIndex >= 0) {
        const tracePoint = points[traceIndex];
        const tracePath = tracePoint?.traceName
          ? tracePathRefs.current.get(tracePoint.traceName)
          : undefined;
        if (tracePath) {
          const traceLength = tracePath.getTotalLength();
          const traceProgress =
            segmentIndex < traceIndex
              ? 0
              : segmentIndex === traceIndex
                ? progress
                : 1;
          tracePath.style.strokeDasharray = `${traceLength}`;
          tracePath.style.strokeDashoffset = `${
            traceLength * (1 - traceProgress)
          }`;
          tracePath.style.opacity = "1";
        }
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
        activePath.style.opacity = points[index]?.tracePath
          ? "0"
          : (movingDown ? index <= segmentIndex : index === segmentIndex)
            ? "1"
            : "0";
      });

      const tailAngle = movingDown ? angle : angle + 180;

      comet.style.opacity = "1";
      comet.style.transform = `translate3d(${x - 15}px, ${y - 15}px, 0)`;
      comet.dataset.side = x > currentLayout.width * 0.72 ? "left" : "right";
      tailRef.current?.style.setProperty(
        "transform",
        `translateY(-50%) rotate(${tailAngle}deg)`,
      );
      coreRef.current?.style.setProperty(
        "transform",
        `rotate(${scrollTop * 0.18}deg)`,
      );

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
      if (segmentIndex === points.length - 2 && progress >= 0.985) {
        comet.dataset.final = "true";
      } else {
        delete comet.dataset.final;
      }
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
        if (
          points[stageIndex]?.portalRadius ||
          points[stageIndex]?.orbitRadius
        ) {
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
    rootRef.current = root;

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
        tracePathRefs.current.clear();

        const points = anchorElements.map((element, index) => {
          const bounds = element.getBoundingClientRect();
          const traceName = element.dataset.signalTrace;
          const tracePoint = element.dataset.signalTracePoint;
          const tracePath = traceName
            ? root.querySelector<SVGPathElement>(
                `path[data-signal-trace="${traceName}"]`,
              )
            : null;
          const traceLength = tracePath?.getTotalLength() ?? 0;
          const traceStart = tracePath
            ? getRootPathPoint(tracePath, 0, rootBounds)
            : null;
          const traceTriggerStart = traceStart
            ? traceStart.y -
              window.innerHeight * (rootBounds.width < 860 ? 0.34 : 0.42)
            : undefined;
          const tracedPoint =
            tracePath && tracePoint
              ? getRootPathPoint(
                  tracePath,
                  tracePoint === "end" ? traceLength : 0,
                  rootBounds,
                )
              : null;
          if (traceName && tracePath) {
            tracePathRefs.current.set(traceName, tracePath);
          }
          const portalRatio = Number(element.dataset.signalPortalRatio ?? 0);
          const orbitRatio = Number(
            element.dataset.signalOrbitRatio ??
              (element.dataset.signalAnchor === "interviewer" ? "0.42" : "0"),
          );
          return {
            key: element.dataset.signalAnchor ?? String(index),
            label: element.dataset.signalLabel ?? "SIGNAL ONLINE",
            route: element.dataset.signalRoute,
            traceName,
            tracePath:
              tracePoint === "start" && tracePath
                ? sampleRootPath(tracePath, rootBounds)
                : undefined,
            triggerY:
              tracePoint === "start"
                ? traceTriggerStart
                : tracePoint === "end" && traceTriggerStart !== undefined
                  ? traceTriggerStart +
                    (rootBounds.width < 860
                      ? 260
                      : Number(element.dataset.signalTriggerDistance ?? 360))
                  : undefined,
            portalRadius:
              portalRatio > 0
                ? Math.min(bounds.width, bounds.height) * portalRatio
                : 0,
            orbitRadius:
              orbitRatio > 0
                ? Math.min(bounds.width, bounds.height) * orbitRatio
                : 0,
            x:
              tracedPoint?.x ??
              bounds.left - rootBounds.left + bounds.width / 2,
            y:
              tracedPoint?.y ?? bounds.top - rootBounds.top + bounds.height / 2,
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
            (point.triggerY ?? point.y) - window.innerHeight * 0.38,
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
            <path
              key={`base-${index}`}
              ref={(node) => {
                basePathRefs.current[index] = node;
              }}
              d={segment}
              style={{
                opacity: layout.points[index]?.tracePath ? 0 : undefined,
              }}
            />
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
          data-portal={point.portalRadius > 0 || point.orbitRadius > 0}
          data-visited="false"
          style={{
            transform: `translate3d(${point.x - 8}px, ${point.y - 8}px, 0)`,
            display:
              point.key === "origin" ||
              point.traceName ||
              point.portalRadius > 0 ||
              point.orbitRadius > 0
                ? "none"
                : undefined,
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
