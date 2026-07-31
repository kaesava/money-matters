export interface BudgetAlertEmailDetails {
    categoryName: string;
    limitAmount: string;
    spentAmount: string;
    householdName?: string;
}
export declare function sendEmailViaResend(options: {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
        filename: string;
        content: string;
    }>;
}): Promise<{
    success: boolean;
    simulated: boolean;
    data?: undefined;
} | {
    success: boolean;
    data: any;
    simulated?: undefined;
}>;
export declare function sendBudgetAlertEmail(to: string, details: BudgetAlertEmailDetails): Promise<{
    success: boolean;
    simulated: boolean;
    data?: undefined;
} | {
    success: boolean;
    data: any;
    simulated?: undefined;
}>;
//# sourceMappingURL=email.d.ts.map