import Link from "next/link";

interface HeaderProps {
    isLoggedIn?: boolean;
    userData?: { name: string };
}

const Header = (props: HeaderProps): JSX.Element => {
    return (
        <header className="border-b border-gray-200 bg-white">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <h1 className="text-2xl font-bold">Ashboard</h1>
                    <nav className="hidden md:flex gap-6">
                        {/* Navigation links can be added here */}
                    </nav>
                </div>
                <nav className="flex items-center gap-4">
                    {props.isLoggedIn && (
                        <Link href="/login" className="text-sm hover:text-gray-600">
                            {props.userData?.name || 'user'}
                        </Link>
                    )}
                    {!props.isLoggedIn && (
                        <Link href="/login" className="text-sm hover:text-gray-600">
                            Login
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
};
export default Header;