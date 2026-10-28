import { useEffect } from "react";

export interface DocumentHeadOptions {
  title: string;
  description?: string;
}

/**
 * Custom hook to update the document title and meta description tag
 * for SEO and accessible screen reader navigation across public pages.
 */
export function useDocumentHead({ title, description }: DocumentHeadOptions): void {
  useEffect(() => {
    // Set document title
    const previousTitle = document.title;
    document.title = title;

    // Set or create meta description tag
    let metaDescription = document.querySelector('meta[name="description"]');
    const createdMeta = !metaDescription;
    const previousDescription = metaDescription?.getAttribute("content") || "";

    if (description) {
      if (!metaDescription) {
        metaDescription = document.createElement("meta");
        metaDescription.setAttribute("name", "description");
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute("content", description);
    }

    return () => {
      document.title = previousTitle;
      if (createdMeta && metaDescription && metaDescription.parentNode) {
        metaDescription.parentNode.removeChild(metaDescription);
      } else if (metaDescription && previousDescription) {
        metaDescription.setAttribute("content", previousDescription);
      }
    };
  }, [title, description]);
}
