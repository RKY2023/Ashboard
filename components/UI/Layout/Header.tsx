import Link from "next/link";

const Header = (props) => {
    return (
        <header className="border-b border-gray-200 bg-white">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <h1 className="text-2xl font-bold">Ashboard</h1>
                <nav className="flex gap-6">
                    <Link href="/home" className="text-sm hover:text-gray-600">
                        Home
                    </Link>
                    <Link href="/products" className="text-sm hover:text-gray-600">
                        Products
                    </Link>
                    <Link href="/dashboard" className="text-sm hover:text-gray-600">
                        Dashboard
                    </Link>
                    <Link href="/login" className="text-sm hover:text-gray-600">
                        Login
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default Header;