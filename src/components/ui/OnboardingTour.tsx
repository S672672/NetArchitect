"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ArrowRight, ArrowLeft, Network, Check } from "lucide-react";

interface TourStep {
  target: string; // CSS selector or "center"
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right" | "center";
  highlight?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "center",
    title: "Welcome to NetVerge",
    content: "A professional network topology designer and validator. This tour will show you around the key features. It takes about 60 seconds.",
    position: "center",
  },
  {
    target: "[data-tour='device-library']",
    title: "Device Library",
    content: "Click or drag any device from this panel to add it to your canvas. There are 18 device types across 4 categories: network devices, infrastructure, clients, and external.",
    position: "right",
    highlight: true,
  },
  {
    target: "[data-tour='canvas']",
    title: "Network Canvas",
    content: "This is where you design your network topology. Drag to pan, scroll to zoom. Connect devices by dragging from one device handle to another. Click devices to configure them.",
    position: "center",
    highlight: true,
  },
  {
    target: "[data-tour='properties-tab']",
    title: "Device Properties",
    content: "Select any device on the canvas, then click this tab to configure IP addresses, subnets, VLANs, gateways, and other settings. IP validation runs automatically.",
    position: "left",
    highlight: true,
  },
  {
    target: "[data-tour='validation-tab']",
    title: "Validation Engine",
    content: "Click this tab to see real-time validation results. The engine runs 9 rules: isolated devices, single points of failure, subnet overlap, invalid IPs, and more.",
    position: "left",
    highlight: true,
  },
  {
    target: "[data-tour='validate-button']",
    title: "Validate Button",
    content: "Click here to manually trigger a full validation scan. Validation also runs automatically when you change the topology.",
    position: "bottom",
    highlight: true,
  },
  {
    target: "[data-tour='export-button']",
    title: "Export & Import",
    content: "Export your network as JSON (for backup/sharing), PNG, or SVG. You can also import previously exported projects.",
    position: "bottom",
    highlight: true,
  },
  {
    target: "[data-tour='paths-button']",
    title: "Traffic Flow Analysis",
    content: "Select a source and destination device to find and visualize the path between them. Great for understanding how traffic flows through your network.",
    position: "bottom",
    highlight: true,
  },
  {
    target: "center",
    title: "Keyboard Shortcuts",
    content: "Press Ctrl+K to open the Command Palette for quick access to all actions. Use Ctrl+Z/Ctrl+Shift+Z for undo/redo, Delete to remove selected items, and Ctrl+S to save.",
    position: "center",
  },
  {
    target: "center",
    title: "You're all set!",
    content: "Start by clicking a device in the library, or press Ctrl+K to open the Command Palette. Try loading the Demo project from the Projects dashboard to see validation in action.",
    position: "center",
  },
];

export function OnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourCompleted, setTourCompleted] = useState(false);

  // Show tour for first-time users
  useEffect(() => {
    const hasSeenTour = localStorage.getItem("NetVerge-tour-completed");
    if (!hasSeenTour) {
      // Delay to let the page render
      const timer = setTimeout(() => setIsActive(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setTourCompleted(true);
    }
  }, []);

  const step = TOUR_STEPS[currentStep];

  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeTour();
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const completeTour = useCallback(() => {
    setIsActive(false);
    setTourCompleted(true);
    localStorage.setItem("NetVerge-tour-completed", "true");
    setCurrentStep(0);
  }, []);

  const restartTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    setTourCompleted(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        nextStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevStep();
      } else if (e.key === "Escape") {
        completeTour();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isActive, nextStep, prevStep, completeTour]);

  if (!isActive) {
    // Show small "restart tour" button after completion
    if (tourCompleted) {
      return (
        <button
          onClick={restartTour}
          className="fixed bottom-12 right-4 z-50 text-[10px] text-muted-foreground hover:text-foreground transition-colors bg-card border border-border rounded px-2 py-1 shadow-sm"
          title="Restart the guided tour"
        >
          ? Tour
        </button>
      );
    }
    return null;
  }

  const isCenter = step.position === "center";

  return (
    <>
      {/* Backdrop overlay */}
      {step.highlight && !isCenter && (
        <div className="fixed inset-0 z-[90] bg-black/30 pointer-events-auto" onClick={completeTour} />
      )}
      {isCenter && (
        <div className="fixed inset-0 z-[90] bg-black/50 pointer-events-auto" onClick={completeTour} />
      )}

      {/* Tour Card */}
      <div
        className={`fixed z-[95] ${
          isCenter
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            : step.position === "right"
            ? "left-64 top-1/2 -translate-y-1/2 ml-4"
            : step.position === "left"
            ? "right-80 top-1/2 -translate-y-1/2 mr-4"
            : step.position === "top"
            ? "top-20 left-1/2 -translate-x-1/2"
            : "bottom-20 left-1/2 -translate-x-1/2"
        } w-80 bg-card border border-border rounded-lg shadow-2xl p-4 pointer-events-auto`}
      >
        {/* Progress */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentStep
                    ? "bg-foreground"
                    : i < currentStep
                    ? "bg-foreground/40"
                    : "bg-border"
                }`}
              />
            ))}
          </div>
          <button
            onClick={completeTour}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Content */}
        <h3 className="font-semibold text-sm mb-1.5">{step.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          {step.content}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>

          <span className="text-[10px] text-muted-foreground">
            {currentStep + 1} / {TOUR_STEPS.length}
          </span>

          {currentStep === TOUR_STEPS.length - 1 ? (
            <button
              onClick={completeTour}
              className="flex items-center gap-1 text-xs px-3 py-1 bg-foreground text-background rounded font-medium hover:opacity-90 transition-opacity"
            >
              <Check className="w-3 h-3" />
              Finish
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="flex items-center gap-1 text-xs px-3 py-1 bg-foreground text-background rounded font-medium hover:opacity-90 transition-opacity"
            >
              Next
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
