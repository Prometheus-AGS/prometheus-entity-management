import React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-context";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className="shrink-0 bg-muted/90 backdrop-blur-sm hover:bg-accent"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="size-4 text-amber-300" aria-hidden />
      ) : (
        <Moon className="size-4 text-muted-foreground" aria-hidden />
      )}
    </Button>
  );
}
