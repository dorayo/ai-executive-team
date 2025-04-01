declare module '../components/ui/button' {
  import { ButtonHTMLAttributes, forwardRef } from 'react';
  import { cva } from 'class-variance-authority';

  export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    asChild?: boolean;
  }

  export const Button: React.ForwardRefExoticComponent<ButtonProps>;
  export const buttonVariants: ReturnType<typeof cva>;
}

declare module '../components/ui/input' {
  import { InputHTMLAttributes, forwardRef } from 'react';

  export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

  export const Input: React.ForwardRefExoticComponent<InputProps>;
}

declare module '../components/ui/card' {
  import { HTMLAttributes, forwardRef } from 'react';

  export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

  export const Card: React.ForwardRefExoticComponent<CardProps>;
  export const CardHeader: React.ForwardRefExoticComponent<CardProps>;
  export const CardTitle: React.ForwardRefExoticComponent<CardProps>;
  export const CardDescription: React.ForwardRefExoticComponent<CardProps>;
  export const CardContent: React.ForwardRefExoticComponent<CardProps>;
  export const CardFooter: React.ForwardRefExoticComponent<CardProps>;
}

declare module '../components/ui/scroll-area' {
  import { HTMLAttributes, forwardRef } from 'react';
  import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

  export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {}

  export const ScrollArea: React.ForwardRefExoticComponent<ScrollAreaProps>;
  export const ScrollBar: React.ForwardRefExoticComponent<ScrollAreaProps>;
} 