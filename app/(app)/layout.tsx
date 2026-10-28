// The group blocks on the session by design, so navigations into it are not
// instant. This opts the segment out of Next's dev-only instant validation.
// The panel shells live one level down, in `(staff)` and `familia`.
export const instant = false;

export default function AppGroupLayout({ children }: LayoutProps<"/">) {
  return children;
}
