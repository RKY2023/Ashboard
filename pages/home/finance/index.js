const Finance = (props) => {
    const pf = 0;
    const tax = 0; // mutual funds &  SIP (systematic investment plan)
    const baseYearly = 700000;
    const joiningBonusYearly = 0;
    const performanceBonusYearly = 0;
    // const performanceBonusYearly = 100000;
    const ctcYearly = baseYearly + joiningBonusYearly + performanceBonusYearly;
    const ctcMonthly = ctcYearly/12;
    const grossMonthly = ctcMonthly - pf - tax ;
    const sharpenerPay = (grossMonthly * .17) * (1 + .18) ; // 20.6 %
    return (
        <>
        <h1>Finance</h1>
        <div className="m-3 bg-white">
            ctcYrly = Yearly ctc
            Monthly in hand ctc - pf -tax
            sharpenerPay : {sharpenerPay}
        </div>
        </>
    );
};
export default Finance;