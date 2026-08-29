"use client";

import { Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/cn";
import styles from "./select.module.css";

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface CustomSelectProps<T extends string | number = string> {
  options: SelectOption<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
  size?: "default" | "compact";
}

/** Only string labels can be typeahead-matched — descriptions/rich nodes
 * are ignored rather than coerced into something misleading. */
function optionLabelText(label: ReactNode): string {
  return typeof label === "string" ? label.toLowerCase() : "";
}

export function CustomSelect<T extends string | number = string>({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = "Select an option...",
  disabled = false,
  className,
  id,
  name,
  "aria-label": ariaLabel,
  size = "default",
}: CustomSelectProps<T>) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const typeaheadRef = useRef<{ query: string; timeoutId: number | null }>({
    query: "",
    timeoutId: null,
  });

  const [isOpen, setIsOpen] = useState(false);
  const isControlled = controlledValue !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState<T | undefined>(defaultValue);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const activeValue = isControlled ? controlledValue : uncontrolledValue;
  const selectedOption = options.find((opt) => opt.value === activeValue);
  const optionId = (index: number) => `${selectId}-option-${index}`;

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  // Keeps the highlighted option in view during keyboard navigation — the
  // dropdown scrolls but focus never leaves the trigger, so nothing else does.
  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    // jsdom (unit tests) doesn't implement scrollIntoView at all.
    optionRefs.current[highlightedIndex]?.scrollIntoView?.({ block: "nearest" });
  }, [isOpen, highlightedIndex]);

  const selectOption = useCallback(
    (opt: SelectOption<T>) => {
      if (opt.disabled) return;
      if (!isControlled) {
        setUncontrolledValue(opt.value);
      }
      onChange?.(opt.value);
      setIsOpen(false);
      triggerRef.current?.focus();
    },
    [isControlled, onChange],
  );

  const findFirstEnabled = () => options.findIndex((o) => !o.disabled);
  const findLastEnabled = () => {
    for (let i = options.length - 1; i >= 0; i--) {
      if (!options[i]?.disabled) return i;
    }
    return -1;
  };

  const handleTypeahead = (key: string) => {
    if (options.length === 0) return;
    const typeahead = typeaheadRef.current;
    if (typeahead.timeoutId) window.clearTimeout(typeahead.timeoutId);
    typeahead.query += key.toLowerCase();
    typeahead.timeoutId = window.setTimeout(() => {
      typeahead.query = "";
      typeahead.timeoutId = null;
    }, 700);

    const startIndex = isOpen ? highlightedIndex : options.findIndex((o) => o.value === activeValue);
    const total = options.length;
    let matchIndex = -1;
    for (let step = 1; step <= total; step++) {
      const idx = (startIndex + step + total) % total;
      const option = options[idx];
      if (option && !option.disabled && optionLabelText(option.label).startsWith(typeahead.query)) {
        matchIndex = idx;
        break;
      }
    }
    if (matchIndex === -1) return;

    if (isOpen) {
      setHighlightedIndex(matchIndex);
    } else {
      const match = options[matchIndex];
      if (match) selectOption(match);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement | HTMLDivElement>) => {
    if (disabled) return;

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < options.length) {
          const opt = options[highlightedIndex];
          if (opt) selectOption(opt);
        } else {
          setIsOpen((prev) => !prev);
          if (!isOpen) {
            const currentIdx = options.findIndex((o) => o.value === activeValue);
            setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
          }
        }
        break;

      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          const currentIdx = options.findIndex((o) => o.value === activeValue);
          setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
        } else {
          setHighlightedIndex((prev) => {
            let next = prev + 1;
            while (next < options.length && options[next]?.disabled) {
              next++;
            }
            return next < options.length ? next : prev;
          });
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          const currentIdx = options.findIndex((o) => o.value === activeValue);
          setHighlightedIndex(currentIdx >= 0 ? currentIdx : options.length - 1);
        } else {
          setHighlightedIndex((prev) => {
            let next = prev - 1;
            while (next >= 0 && options[next]?.disabled) {
              next--;
            }
            return next >= 0 ? next : prev;
          });
        }
        break;

      case "Home": {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        const firstEnabled = findFirstEnabled();
        if (firstEnabled >= 0) setHighlightedIndex(firstEnabled);
        break;
      }

      case "End": {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        const lastEnabled = findLastEnabled();
        if (lastEnabled >= 0) setHighlightedIndex(lastEnabled);
        break;
      }

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;

      case "Tab":
        if (isOpen) {
          setIsOpen(false);
        }
        break;

      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          handleTypeahead(e.key);
        }
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(styles.selectContainer, className)}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden native input for form compatibility */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={activeValue !== undefined ? String(activeValue) : ""}
        />
      )}

      <button
        ref={triggerRef}
        type="button"
        id={selectId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        aria-activedescendant={isOpen && highlightedIndex >= 0 ? optionId(highlightedIndex) : undefined}
        disabled={disabled}
        className={cn(
          styles.trigger,
          isOpen && styles.triggerOpen,
          size === "compact" && styles.triggerCompact,
        )}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            if (!isOpen) {
              const currentIdx = options.findIndex((o) => o.value === activeValue);
              setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
            }
          }
        }}
      >
        <span
          className={cn(
            styles.triggerText,
            !selectedOption && styles.placeholder,
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn(styles.chevron, isOpen && styles.chevronOpen)}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            role="listbox"
            aria-labelledby={selectId}
            className={styles.dropdown}
          >
            {options.map((option, index) => {
              const isSelected = option.value === activeValue;
              const isHighlighted = highlightedIndex === index;

              return (
                <button
                  key={String(option.value)}
                  ref={(el) => {
                    optionRefs.current[index] = el;
                  }}
                  type="button"
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  className={cn(
                    styles.optionItem,
                    isSelected && styles.optionSelected,
                    isHighlighted && styles.optionHighlighted,
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectOption(option)}
                >
                  <div className={styles.optionContent}>
                    <span>{option.label}</span>
                    {option.description && (
                      <span className={styles.optionDescription}>
                        {option.description}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check size={14} className={styles.checkIcon} aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
