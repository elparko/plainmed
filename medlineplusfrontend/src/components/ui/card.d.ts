import { HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  className?: string
}

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  className?: string
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

export declare const Card: React.FC<CardProps>
export declare const CardHeader: React.FC<CardHeaderProps>
export declare const CardTitle: React.FC<CardTitleProps>
export declare const CardDescription: React.FC<CardDescriptionProps>
export declare const CardContent: React.FC<CardContentProps> 