import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function DataList() {
  return (
    <Card className="max-w-[400px]">
      <CardHeader className="flex flex-row items-center gap-4">
        <img
          alt="GitHub logo"
          height={40}
          className="rounded-sm"
          src="https://avatars.githubusercontent.com/u/86160567?s=200&v=4"
          width={40}
        />
        <div>
          <CardTitle className="text-base">shadcn/ui</CardTitle>
          <CardDescription>shadcn.com</CardDescription>
        </div>
      </CardHeader>
      <div className="border-t" />
      <CardContent className="pt-4">
        <p>Beautifully designed components built with Radix UI and Tailwind CSS.</p>
      </CardContent>
      <div className="border-t" />
      <CardHeader className="pb-3">
        <a
          href="https://github.com/shadcn-ui/ui"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Visit GitHub →
        </a>
      </CardHeader>
    </Card>
  );
}

export default DataList;