import { Component, type ReactNode } from "react";
import CrashScreen from "./CrashScreen";

/** Catches anything that breaks drawing the app and shows the crash screen instead of a blank page. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error ?? new Error("unknown") };
  }

  componentDidCatch(error: unknown) {
    console.error("Cadence crashed", error);
  }

  render() {
    return this.state.error ? <CrashScreen error={this.state.error} /> : this.props.children;
  }
}
