import { Document, Model } from "mongoose";

interface MonthData {
    month: string;
    count: number;
}



export async function generateLast12MonthsData<T extends Document>(
    model: Model<T>
): Promise<{ last12Months: MonthData[] }> {
    const last12Months: MonthData[] = [];
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1);

    for (let i = 11; i >= 0; i--) {
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - i * 28);
        const startDate = new Date(endDate.getFullYear(), currentDate.getMonth(), endDate.getDate() - 28);

        const monthYear = endDate.toLocaleString('default', { day: "numeric", month: "short", year: "numeric" });
        const count = await model.countDocuments({
            createdAt: {
                $gte: startDate,
                $lt: endDate,
            },
        });
        last12Months.push({ month: monthYear, count });
    };
    return { last12Months }
}


export async function generateFilteredLast12MonthsData<T extends Document>(
    model: Model<T>,
    filter: object
): Promise<{ last12Months: MonthData[] }> {
    const last12Months: MonthData[] = [];
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1);

    for (let i = 11; i >= 0; i--) {
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - i * 28);
        const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 28);

        const monthYear = endDate.toLocaleString('default', { day: "numeric", month: "short", year: "numeric" });
        
        // Combinăm filtrul existent cu filtrul pentru dată
        const dateFilter = {
            ...filter,
            createdAt: {
                $gte: startDate,
                $lt: endDate,
            },
        };
        
        const count = await model.countDocuments(dateFilter);
        last12Months.push({ month: monthYear, count });
    };
    return { last12Months }
}
