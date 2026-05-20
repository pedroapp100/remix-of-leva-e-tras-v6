import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      richColors
      expand
      closeButton
      duration={4000}
      mobileOffset={{ top: 16 }}
      containerStyle={{ zIndex: 9999 }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:shadow-xl group-[.toaster]:text-sm group-[.toaster]:font-medium group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-xs group-[.toast]:opacity-90",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
        style: { filter: "brightness(1.25)", opacity: 1 },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
