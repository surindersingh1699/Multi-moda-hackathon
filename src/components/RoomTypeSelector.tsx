"use client";

import { useState, useRef, useEffect } from "react";

const SUGGESTIONS = [
  { label: "Bedroom", icon: "🛏️" },
  { label: "Living Room", icon: "🛋️" },
  { label: "Bathroom", icon: "🚿" },
  { label: "Kitchen", icon: "🍳" },
  { label: "Home Office", icon: "💻" },
  { label: "Dining Room", icon: "🪑" },
  { label: "Kids Room", icon: "🧸" },
  { label: "Studio Apartment", icon: "🏠" },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function RoomTypeSelector({ value, onChange, disabled }: Props) {
  const [isCustom, setIsCustom] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSuggestion = SUGGESTIONS.find(
    (s) => s.label.toLowerCase() === value.toLowerCase()
  );

  useEffect(() => {
    if (isCustom && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCustom]);

  const handleSuggestionClick = (label: string) => {
    setIsCustom(false);
    onChange(label);
  };

  const handleCustomClick = () => {
    setIsCustom(true);
    onChange("");
  };

  return (
    <div className="w-full space-y-3">
      <label className="block text-sm font-medium text-txt-secondary">
        What type of room is this?
      </label>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => {
          const isActive =
            !isCustom && value.toLowerCase() === s.label.toLowerCase();
          return (
            <button
              key={s.label}
              type="button"
              disabled={disabled}
              onClick={() => handleSuggestionClick(s.label)}
              className={`
                inline-flex items-center gap-1.5 rounded-full px-3.5 py-2
                text-sm font-medium transition-all duration-200
                border
                ${
                  isActive
                    ? "border-accent-400 bg-accent-50 text-accent-600 shadow-sm"
                    : "border-accent-100 bg-white/70 text-txt-secondary hover:border-accent-300 hover:bg-accent-50/50"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
              style={
                isActive
                  ? { boxShadow: "0 0 0 1px rgba(232, 117, 58, 0.2)" }
                  : {}
              }
            >
              <span className="text-base leading-none">{s.icon}</span>
              {s.label}
            </button>
          );
        })}

        {/* Custom / Other chip */}
        <button
          type="button"
          disabled={disabled}
          onClick={handleCustomClick}
          className={`
            inline-flex items-center gap-1.5 rounded-full px-3.5 py-2
            text-sm font-medium transition-all duration-200
            border
            ${
              isCustom
                ? "border-accent-400 bg-accent-50 text-accent-600 shadow-sm"
                : "border-dashed border-accent-200 bg-white/50 text-txt-muted hover:border-accent-300 hover:text-txt-secondary"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          <span className="text-base leading-none">✏️</span>
          Other...
        </button>
      </div>

      {/* Custom input */}
      {isCustom && (
        <div className="animate-fadeIn">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder='e.g. "Balcony", "Laundry Room", "Garage"...'
            maxLength={50}
            className="
              w-full rounded-xl border border-accent-200 bg-white/80
              px-4 py-2.5 text-sm text-txt-primary
              placeholder:text-txt-muted
              focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-100
              transition-all duration-200
              disabled:opacity-50
            "
          />
        </div>
      )}

      {/* Current selection indicator */}
      {value && (
        <p className="text-xs text-txt-muted flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5 text-accent-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Styling for:{" "}
          <span className="font-medium text-txt-secondary">
            {selectedSuggestion
              ? `${selectedSuggestion.icon} ${selectedSuggestion.label}`
              : value}
          </span>
        </p>
      )}
    </div>
  );
}
