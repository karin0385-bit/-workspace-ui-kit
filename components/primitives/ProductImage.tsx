"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";

import { resolveProductImageSrc } from "@/lib/computed/product-image";
import { cn } from "@/lib/utils";

type ProductImageProps = {
  imageFile: string;
  productName: string;
  localImageUrls?: Readonly<Record<string, string>>;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  placeholderIconClassName?: string;
};

function ImagePlaceholder({
  className,
  placeholderIconClassName,
}: {
  className?: string;
  placeholderIconClassName?: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-center bg-muted", className)}
    >
      <Package className={cn("text-muted-foreground/30", placeholderIconClassName)} />
    </div>
  );
}

/** 商品画像。CSV の画像列・画像フォルダ・public/products を参照する。 */
export function ProductImage({
  imageFile,
  productName,
  localImageUrls,
  className,
  imageClassName,
  sizes = "96px",
  placeholderIconClassName = "size-8",
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const src = resolveProductImageSrc(imageFile, localImageUrls, productName);

  if (!src || failed) {
    return (
      <ImagePlaceholder
        className={className}
        placeholderIconClassName={placeholderIconClassName}
      />
    );
  }

  if (src.startsWith("blob:") || src.startsWith("http")) {
    return (
      <div className={cn("relative overflow-hidden bg-muted", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className={cn("size-full object-cover", imageClassName)}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        src={src}
        alt=""
        fill
        className={cn("object-cover", imageClassName)}
        sizes={sizes}
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  );
}
