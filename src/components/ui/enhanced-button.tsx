import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:bg-primary-dark hover:shadow-medium active:scale-95 transition-all ease-bounce",
        destructive:
          "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90 active:scale-95 transition-all ease-bounce",
        outline:
          "border border-input bg-background shadow-soft hover:bg-accent hover:text-accent-foreground hover:shadow-medium active:scale-95 transition-all ease-bounce",
        secondary:
          "bg-secondary text-secondary-foreground shadow-soft hover:bg-secondary/80 hover:shadow-medium active:scale-95 transition-all ease-bounce",
        ghost: "hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all ease-bounce",
        link: "text-primary underline-offset-4 hover:underline active:scale-95 transition-all ease-bounce",
        hero: "bg-gradient-primary text-white shadow-strong hover:shadow-glow hover:scale-105 active:scale-95 font-semibold transition-all ease-bounce",
        premium: "bg-gradient-hero text-white shadow-strong hover:shadow-glow hover:scale-105 active:scale-95 font-semibold border border-white/20 backdrop-blur-sm transition-all ease-bounce",
        glass: "bg-white/10 text-primary-foreground border border-white/20 backdrop-blur-md shadow-soft hover:bg-white/20 hover:shadow-medium active:scale-95 transition-all ease-bounce",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        xl: "h-14 rounded-xl px-10 text-base font-semibold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }