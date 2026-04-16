import IOSSpinner from "@/components/ios-spinner";

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-160px)] w-full items-center justify-center bg-background/50 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-4">
        <IOSSpinner className="h-12 w-12" />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground animate-pulse">
          Synchronizing Workspace
        </p>
      </div>
    </div>
  );
}
