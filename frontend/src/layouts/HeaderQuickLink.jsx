import QuickLink from "./QuickLink";

export default function HeaderQuickLink() {
    return (
        <div className="flex justify-center items-center">
            <QuickLink isHeader={true} /> {/* Pass a prop to QuickLink for header styling */}
        </div>
    );
}